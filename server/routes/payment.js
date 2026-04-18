const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
require('dotenv').config();

// PayU hash generation
router.post('/create-hash', async (req, res) => {
    try {
        const { amount, productinfo, firstname, email, phone, orderId } = req.body;
        const txnid = 'TXN' + Date.now();
        const key = process.env.PAYU_MERCHANT_KEY;
        const salt = process.env.PAYU_MERCHANT_SALT;

        // Update the order with this TXN ID for tracking later
        await Order.findOneAndUpdate({ orderId }, { transactionId: txnid });

        // Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|||||||salt
        const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
        const hash = crypto.createHash('sha512').update(hashString).digest('hex');

        res.json({
            success: true,
            key,
            txnid,
            hash,
            amount,
            productinfo,
            firstname,
            email,
            phone,
            surl: `${req.protocol}://${req.get('host')}/api/payment/success`,
            furl: `${req.protocol}://${req.get('host')}/api/payment/failure`
        });
    } catch (error) {
        console.error('Hash generation error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// PayU success callback
router.post('/success', async (req, res) => {
    try {
        const payuResponse = req.body;
        const { txnid, amount, productinfo, firstname, email, status, hash, mihpayid, bank_ref_num } = payuResponse;
        const salt = process.env.PAYU_MERCHANT_SALT;
        const key = process.env.PAYU_MERCHANT_KEY;

        // Verification hash sequence: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
        const verifyString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
        const expectedHash = crypto.createHash('sha512').update(verifyString).digest('hex');

        if (hash === expectedHash && status === 'success') {
            // Update order status in DB automatically
            const orderId = await Order.findOneAndUpdate(
                { transactionId: txnid },
                { 
                    paymentStatus: 'verified', 
                    paymentAmount: Number(amount),
                    mihpayid: mihpayid,
                    bank_ref_num: bank_ref_num,
                    payuStatus: 'success'
                },
                { new: true }
            );
            
            // Redirect to track page with the correct Order ID
            const targetOrderId = orderId ? orderId.orderId : txnid;
            res.redirect(`${process.env.FRONTEND_URL || ''}/track.html?id=${targetOrderId}&status=success`);
        } else {
            res.redirect(`${process.env.FRONTEND_URL || ''}/track.html?status=failed`);
        }
    } catch (error) {
        console.error('Payment success handling error:', error);
        res.redirect('/track.html?status=error');
    }
});

// PayU failure callback
router.post('/failure', (req, res) => {
    res.redirect('/track.html?status=failed');
});

module.exports = router;
