const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const db = require('./config/db');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const existingManager = await User.findOne({ role: 'manager' });
    if (!existingManager) {
      const hashedPassword = await bcrypt.hash('defaultPassword123', 10);
      
      const manager = new User({
        username: 'admin',
        email: 'admin@company.com',
        password: hashedPassword,
        role: 'manager'
      });

      await manager.save();
      console.log('🎉 Default manager created:', manager.username);
    }
    
    mongoose.disconnect();
  } catch (err) {
    console.error('🔥 Seed failed:', err);
    process.exit(1);
  }
};

seedDatabase();

(async () => {
  try {
    // Connect to the database
    await db();

    const connection = mongoose.connection;

    // Drop the unique index on the `email` field in the `staffs` collection
    await connection.collection('staffs').dropIndex('email_1');
    console.log('Dropped unique index on email field in staffs collection.');

    // Close the connection
    await connection.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error dropping index:', error);
  }
})();