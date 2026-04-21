const mongoose = require('mongoose');
const path = require('path');
const Order = require('../server/models/Order');
require('dotenv').config();

const checkOrders = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_video_crm';
        await mongoose.connect(uri);
        const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
        orders.forEach(o => {
            console.log(`Order ${o.orderId}:`, JSON.stringify(o.assets, null, 2));
            console.log(`Order ${o.orderId} Screenshot:`, o.paymentScreenshot);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkOrders();
