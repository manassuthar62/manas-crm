const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

// POST: Admin/Staff Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// PUT: Update current user's login credentials
router.put('/me/credentials', authenticate, async (req, res) => {
    try {
        const nextEmail = String(req.body.email || '').trim().toLowerCase();
        const nextPassword = String(req.body.password || '');

        if (!nextEmail) {
            return res.status(400).json({ success: false, message: 'Email required hai.' });
        }

        if (nextPassword && nextPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password kam se kam 6 characters ka hona chahiye.' });
        }

        const existingUser = await User.findOne({ email: nextEmail, _id: { $ne: req.user.id } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Ye email pehle se use ho rahi hai.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.email = nextEmail;
        if (nextPassword) {
            user.password = await bcrypt.hash(nextPassword, 10);
        }

        await user.save();

        const refreshedToken = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login credentials updated successfully',
            token: refreshedToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST: Register new user (Editor/Admin)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ success: false, message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'editor'
        });

        await user.save();
        res.json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET: Fetch all editors (Team)
router.get('/team', async (req, res) => {
    try {
        const users = await User.find({ role: 'editor' }).select('-password');
        const team = users.map(u => ({
            id: u._id,
            name: u.name,
            role: 'Video Editor',
            activeJobs: 0,
            totalEarned: 0
        }));
        res.json({ success: true, team });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
