const mongoose = require('mongoose');
const Order = require('./server/models/Order');
require('dotenv').config();

const checkOrder = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_video_crm';
        await mongoose.connect(uri);
        const order = await Order.findOne({ orderId: 'AV-1037' });
        console.log('Order AV-1037 Assets:', JSON.stringify(order.assets, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkOrder();
