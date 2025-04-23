const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

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