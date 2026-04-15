const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');

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
