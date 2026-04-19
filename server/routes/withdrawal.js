const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET: My Withdrawal History (Editor)
router.get('/my', authenticate, async (req, res) => {
    try {
        const history = await Withdrawal.find({ editorId: req.user.id }).sort({ createdAt: -1 });
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET: All Withdrawal Requests (Admin)
router.get('/all', authenticate, adminOnly, async (req, res) => {
    try {
        const requests = await Withdrawal.find()
            .populate('editorId', 'name email')
            .sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST: Request Withdrawal (Editor)
router.post('/request', authenticate, async (req, res) => {
    try {
        const { amount, paymentDetails } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        if (!paymentDetails) {
            return res.status(400).json({ success: false, message: 'Payment details required' });
        }

        // Calculate available balance
        // 1. Total earned from Completed orders
        const completedOrders = await Order.find({ 
            editor: req.user.id, 
            status: 'Completed' 
        });
        const totalEarned = completedOrders.reduce((sum, o) => sum + (o.editorPayout || 0), 0);

        // 2. Total already withdrawn (approved OR pending)
        // We include pending to prevent double-requesting the same money
        const withdrawals = await Withdrawal.find({ 
            editorId: req.user.id, 
            status: { $in: ['pending', 'approved'] } 
        });
        const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

        const availableBalance = totalEarned - totalWithdrawn;

        if (amount > availableBalance) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient balance. Available: Rs ${availableBalance}` 
            });
        }

        const newRequest = new Withdrawal({
            editorId: req.user.id,
            amount,
            paymentDetails
        });

        await newRequest.save();
        res.json({ success: true, message: 'Withdrawal request submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// PUT: Update Request Status (Admin)
router.put('/update/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const { status, adminNote, transactionId } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const request = await Withdrawal.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        request.status = status;
        if (adminNote) request.adminNote = adminNote;
        if (transactionId) request.transactionId = transactionId;
        
        await request.save();
        res.json({ success: true, message: `Request ${status} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET: Current Balance Info (Editor)
router.get('/balance', authenticate, async (req, res) => {
    try {
        const completedOrders = await Order.find({ 
            editor: req.user.id, 
            status: 'Completed' 
        });
        const totalEarned = completedOrders.reduce((sum, o) => sum + (o.editorPayout || 0), 0);

        const withdrawals = await Withdrawal.find({ 
            editorId: req.user.id, 
            status: { $in: ['pending', 'approved'] } 
        });
        
        const pendingAmount = withdrawals
            .filter(w => w.status === 'pending')
            .reduce((sum, w) => sum + w.amount, 0);
            
        const approvedAmount = withdrawals
            .filter(w => w.status === 'approved')
            .reduce((sum, w) => sum + w.amount, 0);

        const availableBalance = totalEarned - approvedAmount - pendingAmount;

        res.json({
            success: true,
            totalEarned,
            pendingAmount,
            approvedAmount,
            availableBalance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
