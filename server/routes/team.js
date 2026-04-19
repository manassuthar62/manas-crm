const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');

// GET: All Editors/Staff
router.get('/all', async (req, res) => {
    try {
        const users = await User.find({ role: { $in: ['editor', 'staff'] } });
        
        // Fetch stats for each user (Active jobs and total earned)
        const teamData = await Promise.all(users.map(async (user) => {
            const activeJobs = await Order.countDocuments({ editor: user._id, status: { $ne: 'Completed' } });
            const orders = await Order.find({ editor: user._id });
            const totalEarned = orders.reduce((sum, o) => sum + (o.editorPayout || 0), 0);

            return {
                id: user._id,
                name: user.name,
                role: user.role,
                activeJobs,
                totalEarned,
                isAvailable: user.isAvailable
            };
        }));

        res.json({ success: true, team: teamData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET: Single team member details
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Editor not found' });
        }

        const assignedOrders = await Order.find({ editor: user._id })
            .select('orderId clientName status paymentStatus editorPayout createdAt')
            .sort({ createdAt: -1 });

        const activeJobs = assignedOrders.filter(order => order.status !== 'Completed').length;
        const totalEarned = assignedOrders.reduce((sum, order) => sum + (order.editorPayout || 0), 0);

        res.json({
            success: true,
            member: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAvailable: user.isAvailable,
                createdAt: user.createdAt,
                activeJobs,
                totalEarned,
                assignedOrders
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// PUT: Update team member credentials/profile
router.put('/:id/credentials', async (req, res) => {
    try {
        const { name, email, password, isAvailable } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Editor not found' });
        }

        const nextName = String(name || '').trim();
        const nextEmail = String(email || '').trim().toLowerCase();
        const nextPassword = String(password || '');

        if (!nextName || !nextEmail) {
            return res.status(400).json({ success: false, message: 'Name aur email required hai.' });
        }

        const existingUser = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Ye email pehle se use ho rahi hai.' });
        }

        if (nextPassword && nextPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password kam se kam 6 characters ka hona chahiye.' });
        }

        user.name = nextName;
        user.email = nextEmail;
        if (typeof isAvailable !== 'undefined') {
            user.isAvailable = Boolean(isAvailable);
        }
        if (nextPassword) {
            user.password = await bcrypt.hash(nextPassword, 10);
        }

        await user.save();

        res.json({
            success: true,
            member: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAvailable: user.isAvailable,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST: Add New Member
router.post('/add', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const newUser = new User({ name, email, password, role });
        await newUser.save();
        res.status(201).json({ success: true, user: newUser });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
