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
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Simple Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
const orderRoutes = require('./routes/order');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/team');
const paymentRoutes = require('./routes/payment');

app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/payment', paymentRoutes);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_video_crm';
mongoose.connect(MONGODB_URI, { family: 4 })
    .then(() => console.log('Connected to MongoDB at ' + MONGODB_URI))
    .catch(err => {
        console.error('\x1b[31m%s\x1b[0m', 'CRITICAL ERROR: Could not connect to MongoDB!');
        console.error('\x1b[33m%s\x1b[0m', 'Please ensure MongoDB is running: "net start MongoDB" or "mongod"');
        console.error(err);
    });

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

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('\x1b[31m%s\x1b[0m', `CRITICAL: Port ${PORT} is already in use by another process!`);
        console.error('\x1b[33m%s\x1b[0m', 'Please close other terminals or kill the process on port 5000.');
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});
