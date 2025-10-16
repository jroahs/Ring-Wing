const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const connectDB = require('./config/db');
require('dotenv').config();

const deleteRecords = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('🗑️  Deleting all menu items...');
    const menuItemResult = await MenuItem.deleteMany({});
    console.log(`✅ Deleted ${menuItemResult.deletedCount} menu items`);

    console.log('🗑️  Deleting all orders...');
    const orderResult = await Order.deleteMany({});
    console.log(`✅ Deleted ${orderResult.deletedCount} orders`);

    console.log('🎉 All menu items and orders have been deleted successfully!');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');

  } catch (error) {
    console.error('❌ Error deleting records:', error);
    process.exit(1);
  }
};

// Run the deletion
deleteRecords();