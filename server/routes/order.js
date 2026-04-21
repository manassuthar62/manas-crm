const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const { calculateETA } = require('../utils/etaHelper');

// File upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(process.cwd(), 'uploads');
        cb(null, dest);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

async function generateOrderMeta() {
    const count = await Order.countDocuments();
    return {
        orderId: `AV-${1000 + count + 1}`,
        queueNumber: count + 1
    };
}

async function removeUploadedFile(filePath) {
    if (!filePath) return;

    try {
        await fs.unlink(path.resolve(process.cwd(), filePath));
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Could not remove uploaded file:', filePath, error);
        }
    }
}

// POST: Create new order
router.post('/create', upload.fields([
    { name: 'assets', maxCount: 10 },
    { name: 'screenshot', maxCount: 1 }
]), async (req, res) => {
    try {
        const { clientName, whatsapp, brief, paymentMethod, transactionId, packageName, packagePrice } = req.body;
        const normalizedWhatsapp = String(whatsapp || '').replace(/[\s-]/g, '');
        const screenshotPath = req.files?.screenshot ? `uploads/${req.files.screenshot[0].filename}` : null;

        if (!clientName || !normalizedWhatsapp || !brief) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        if (!/^\+?[0-9]{10,15}$/.test(normalizedWhatsapp)) {
            return res.status(400).json({ success: false, message: 'Valid WhatsApp number required hai.' });
        }
        
        // Generate Order ID
        const { orderId, queueNumber } = await generateOrderMeta();

        // Assets and Screenshot paths
        const assetPaths = req.files?.assets ? req.files.assets.map(f => `uploads/${f.filename}`) : [];

        // Calculate ETA
        const eta = calculateETA(new Date());

        const newOrder = new Order({
            orderId,
            queueNumber,
            clientName,
            whatsapp: normalizedWhatsapp,
            brief,
            assets: assetPaths,
            packageName: packageName || '',
            packagePrice: Number(packagePrice) || 0,
            detailsSubmitted: true,
            paymentMethod,
            transactionId,
            paymentScreenshot: screenshotPath,
            eta,
            statusUpdatedAt: new Date()
        });

        await newOrder.save();

        res.status(201).json({ 
            success: true, 
            message: 'Order placed successfully', 
            orderId, 
            queueNumber,
            eta 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/create-payment-order', async (req, res) => {
    try {
        const { packageName, packagePrice, paymentMethod } = req.body;

        if (!packageName || !Number(packagePrice)) {
            return res.status(400).json({ success: false, message: 'Package select karna zaruri hai.' });
        }

        const { orderId, queueNumber } = await generateOrderMeta();
        const eta = calculateETA(new Date());

        const order = new Order({
            orderId,
            queueNumber,
            packageName: String(packageName).trim(),
            packagePrice: Number(packagePrice) || 0,
            paymentMethod: paymentMethod || 'online',
            eta,
            detailsSubmitted: false,
            statusUpdatedAt: new Date()
        });

        await order.save();

        res.status(201).json({
            success: true,
            orderId,
            queueNumber,
            eta,
            packageName: order.packageName,
            packagePrice: order.packagePrice
        });
    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/complete/:id', upload.fields([
    { name: 'assets', maxCount: 10 }
]), async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.id });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.paymentStatus !== 'verified') {
            return res.status(400).json({ success: false, message: 'Pehle payment complete honi chahiye.' });
        }

        const { clientName, whatsapp, brief } = req.body;
        const normalizedWhatsapp = String(whatsapp || '').replace(/[\s-]/g, '');

        if (!clientName || !normalizedWhatsapp || !brief) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        if (!/^\+?[0-9]{10,15}$/.test(normalizedWhatsapp)) {
            return res.status(400).json({ success: false, message: 'Valid WhatsApp number required hai.' });
        }

        const assetPaths = req.files?.assets ? req.files.assets.map(f => `uploads/${f.filename}`) : [];

        order.clientName = String(clientName).trim();
        order.whatsapp = normalizedWhatsapp;
        order.brief = String(brief).trim();
        order.assets = assetPaths;
        order.detailsSubmitted = true;
        order.statusUpdatedAt = new Date();

        await order.save();

        res.json({
            success: true,
            message: 'Order details saved successfully',
            orderId: order.orderId
        });
    } catch (error) {
        console.error('Complete order error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET: Track order
router.get('/track/:id', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.id });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        res.json({
            success: true,
            order: order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET: All orders (Admin)
router.get('/all', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('editor', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// PUT: Update order (Admin)
router.put('/update/:id', async (req, res) => {
    try {
        const { status, editor, editorPayout, paymentStatus, paymentAmount } = req.body;
        const existingOrder = await Order.findOne({ orderId: req.params.id });
        if (!existingOrder) return res.status(404).json({ success: false, message: 'Order not found' });

        const updateFields = {};

        if (typeof status !== 'undefined') updateFields.status = status;
        if (typeof editor !== 'undefined') updateFields.editor = editor || null;
        if (typeof paymentStatus !== 'undefined') updateFields.paymentStatus = paymentStatus;
        if (typeof status !== 'undefined' || typeof paymentStatus !== 'undefined' || typeof editor !== 'undefined') {
            updateFields.statusUpdatedAt = new Date();
        }

        if (typeof editorPayout !== 'undefined') {
            const parsedPayout = Number(editorPayout || 0);
            if (!Number.isFinite(parsedPayout) || parsedPayout < 0) {
                return res.status(400).json({ success: false, message: 'Editor payout must be a valid non-negative amount' });
            }

            updateFields.editorPayout = parsedPayout;
        }

        if (typeof paymentAmount !== 'undefined') {
            const parsedPaymentAmount = Number(paymentAmount || 0);
            if (!Number.isFinite(parsedPaymentAmount) || parsedPaymentAmount < 0) {
                return res.status(400).json({ success: false, message: 'Payment amount must be a valid non-negative amount' });
            }

            updateFields.paymentAmount = parsedPaymentAmount;
        }

        const finalPaymentAmount = typeof paymentAmount !== 'undefined'
            ? Number(paymentAmount || 0)
            : Number(existingOrder.paymentAmount || 0);

        if (paymentStatus === 'verified' && (!Number.isFinite(finalPaymentAmount) || finalPaymentAmount <= 0)) {
            return res.status(400).json({ success: false, message: 'Enter payment amount before approving payment' });
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: req.params.id },
            { $set: updateFields },
            { new: true }
        ).populate('editor', 'name');

        res.json({ success: true, order: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// DELETE: Remove order (Admin)
router.delete('/delete/:id', async (req, res) => {
    try {
        const order = await Order.findOneAndDelete({ orderId: req.params.id });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        await Promise.all([
            removeUploadedFile(order.paymentScreenshot),
            ...((order.assets || []).map(removeUploadedFile))
        ]);

        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET: Business Stats (Admin)
router.get('/stats', async (req, res) => {
    try {
        const orders = await Order.find();
        const approvedOrders = orders.filter(o => o.paymentStatus === 'verified' && (o.paymentAmount || 0) > 0);
        const totalRevenue = approvedOrders.reduce((sum, o) => sum + (o.paymentAmount || 0), 0);
        const totalPayouts = orders.reduce((sum, o) => sum + (o.editorPayout || 0), 0);
        
        res.json({
            success: true,
            totalRevenue,
            totalProfit: totalRevenue - totalPayouts,
            totalPayouts,
            approvedPayments: approvedOrders.length,
            activeOrders: orders.filter(o => o.status !== 'Completed').length,
            completedOrders: orders.filter(o => o.status === 'Completed').length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
