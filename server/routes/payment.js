const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
require('dotenv').config();

function sha512(value) {
    return crypto.createHash('sha512').update(String(value)).digest('hex');
}

function getCallbackPayload(req) {
    const bodyKeys = Object.keys(req.body || {});
    return bodyKeys.length ? req.body : (req.query || {});
}

function logPayuPayload(label, payload) {
    const safePayload = { ...payload };
    if (safePayload.hash) {
        safePayload.hash = `[present:${String(payload.hash).length}]`;
    }
    console.log(`${label}:`, safePayload);
}

function buildReverseHashString(body, key, salt) {
    const {
        status = '',
        txnid = '',
        amount = '',
        productinfo = '',
        firstname = '',
        email = '',
        udf1 = '',
        udf2 = '',
        udf3 = '',
        udf4 = '',
        udf5 = '',
        additionalCharges = '',
        additional_charges = ''
    } = body;

    const charges = additionalCharges || additional_charges || '';
    const reverseParts = [
        salt,
        status,
        '',
        '',
        '',
        '',
        '',
        udf5,
        udf4,
        udf3,
        udf2,
        udf1,
        email,
        firstname,
        productinfo,
        amount,
        txnid,
        key
    ];

    const reverseHash = reverseParts.join('|');
    return charges ? `${charges}|${reverseHash}` : reverseHash;
}

// PayU hash generation
router.post('/create-hash', async (req, res) => {
    try {
        let { amount, productinfo, firstname, email, phone, orderId } = req.body;
        orderId = orderId ? String(orderId).trim() : '';
        
        console.log('--- Generating Hash ---');
        console.log('Target Order ID (from UI):', orderId);
        console.log('Amount:', amount);
        logPayuPayload('Create Hash Payload', req.body || {});

        if (!orderId || !amount) {
            console.error('Missing required fields in create-hash request');
            return res.status(400).json({ success: false, message: 'Missing orderId or amount' });
        }

        const txnid = 'TXN' + Date.now();
        const key = process.env.PAYU_MERCHANT_KEY;
        const salt = process.env.PAYU_MERCHANT_SALT;

        // Update the order with this TXN ID for tracking later
        const updated = await Order.findOneAndUpdate(
            { orderId: orderId.trim() }, 
            { transactionId: txnid },
            { new: true }
        );

        if (updated) {
            console.log('Order found and updated with TXN ID:', txnid);
        } else {
            console.warn('WARNING: Order not found in DB with ID:', orderId);
        }

        // Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|||||||salt
        // We use udf1 to carry our internal Order ID (e.g. AV-1005)
        const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${orderId}||||||||||${salt}`;
        const hash = sha512(hashString);

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
            udf1: orderId, // Crucial for redirection
            surl: `${req.protocol}://${req.get('host')}/api/payment/success`,
            furl: `${req.protocol}://${req.get('host')}/api/payment/failure`
        });
    } catch (error) {
        console.error('CRITICAL HASH ERROR:', error.stack);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
});

async function handleSuccessCallback(req, res) {
    try {
        const payload = getCallbackPayload(req);
        const {
            status = '',
            txnid = '',
            amount = '',
            firstname = '',
            email = '',
            productinfo = '',
            hash = '',
            udf1 = ''
        } = payload;

        const key = process.env.PAYU_MERCHANT_KEY;
        const salt = process.env.PAYU_MERCHANT_SALT;
        const normalizedStatus = String(status).toLowerCase();

        console.log('--- PayU Success Callback DEBUG ---');
        console.log('Method:', req.method);
        console.log('Status from PayU:', status);
        console.log('TXN ID:', txnid);
        console.log('Amount:', amount);
        console.log('Received Hash:', hash);
        console.log('Order ID (udf1):', udf1);
        logPayuPayload('Success Callback Payload', payload);

        const reverseHashString = buildReverseHashString(payload, key, salt);
        const calculatedHash = sha512(reverseHashString);
        const isValid = calculatedHash === String(hash).toLowerCase();

        console.log('Reverse Hash String:', reverseHashString);
        console.log('Calculated Hash:', calculatedHash);
        console.log('Hash Validation Result:', isValid ? 'SUCCESS' : 'FAILED');

        if (isValid && normalizedStatus === 'success') {
            // Update order in database
            const updatedOrder = await Order.findOneAndUpdate(
                { $or: [{ orderId: udf1 }, { transactionId: txnid }] },
                {
                    paymentStatus: 'verified',
                    paymentAmount: Number(amount) || 0,
                    transactionId: txnid,
                    mihpayid: payload.mihpayid,
                    bank_ref_num: payload.bank_ref_num,
                    payuHash: hash,
                    payuStatus: normalizedStatus,
                    status: 'New Order' // Move to first stage
                },
                { new: true }
            );

            if (!updatedOrder) {
                console.error('Order not found while updating success callback for:', udf1 || txnid);
                return res.redirect(`${process.env.FRONTEND_URL || ''}/track.html?status=error`);
            }

            console.log('Database updated successfully for Order:', updatedOrder.orderId);
            res.redirect(`${process.env.FRONTEND_URL || ''}/order.html?id=${updatedOrder.orderId}&paid=1&txnid=${encodeURIComponent(txnid)}`);
        } else {
            console.error('Payment Verification Failed or Status not success');
            const failureOrderId = udf1 ? `id=${encodeURIComponent(udf1)}&` : '';
            res.redirect(`${process.env.FRONTEND_URL || ''}/order.html?${failureOrderId}payment=failed`);
        }
    } catch (error) {
        console.error('Payment success handling error:', error);
        res.redirect('/order.html?payment=error');
    }
}

// PayU success callback
router.post('/success', handleSuccessCallback);
router.get('/success', handleSuccessCallback);

async function handleFailureCallback(req, res) {
    const payload = getCallbackPayload(req);
    const orderId = payload?.udf1 ? String(payload.udf1).trim() : '';
    const txnid = payload?.txnid ? String(payload.txnid).trim() : '';

    console.log('--- PayU Failure Callback DEBUG ---');
    console.log('Method:', req.method);
    logPayuPayload('Failure Callback Payload', payload);

    if (orderId || txnid) {
        try {
            const updatedOrder = await Order.findOneAndUpdate(
                { $or: [{ orderId }, { transactionId: txnid }] },
                {
                    paymentStatus: 'failed',
                    transactionId: txnid || undefined,
                    payuHash: payload.hash,
                    payuStatus: String(payload.status || 'failed').toLowerCase() || 'failed'
                },
                { new: true }
            );

            if (updatedOrder) {
                console.log('Marked order as failed:', updatedOrder.orderId);
            } else {
                console.warn('Failure callback received but no order matched:', { orderId, txnid });
            }
        } catch (error) {
            console.error('Could not persist failed payment callback:', error);
        }
    }

    const failureOrderId = orderId ? `id=${encodeURIComponent(orderId)}&` : '';
    res.redirect(`/order.html?${failureOrderId}payment=failed`);
}

// PayU failure callback
router.post('/failure', handleFailureCallback);
router.get('/failure', handleFailureCallback);

module.exports = router;
