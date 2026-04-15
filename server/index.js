const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const orderRoutes = require('./routes/order');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/team');

app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_video_crm';
mongoose.connect(MONGODB_URI, { family: 4 })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// Serve frontend - Catch-all middleware
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API route not found' });
    }

    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Always return JSON for API errors instead of Express HTML pages
app.use((err, req, res, next) => {
    if (req.path.startsWith('/api/')) {
        if (err?.type === 'entity.parse.failed') {
            return res.status(400).json({ success: false, message: 'Invalid JSON body' });
        }

        console.error('API error:', err);
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal server error'
        });
    }

    next(err);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
