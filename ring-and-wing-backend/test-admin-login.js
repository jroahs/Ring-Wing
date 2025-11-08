require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully\n');

    const username = 'admin';
    const password = 'admin123';
    
    console.log('Testing login for:', username);
    console.log('Password:', password);
    console.log('');
    
    // Same query as login controller
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).select('+password').lean();

    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('✅ User found:', user.username);
    console.log('Has password:', !!user.password);
    console.log('Password hash:', user.password);
    console.log('');
    
    // Test password comparison
    console.log('Testing bcrypt.compare...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      console.log('\n❌ Password does not match!');
      console.log('Generating new hash for comparison...');
      const testHash = await bcrypt.hash(password, 10);
      console.log('New hash would be:', testHash);
      
      console.log('\nResetting admin password to admin123...');
      const adminDoc = await User.findOne({ username: 'admin' });
      adminDoc.password = password; // Will be hashed by pre-save hook
      await adminDoc.save();
      console.log('✅ Password reset complete');
      
      // Test again
      const updatedUser = await User.findOne({ username: 'admin' }).select('+password');
      const newMatch = await bcrypt.compare(password, updatedUser.password);
      console.log('New password match:', newMatch);
    } else {
      console.log('✅ Password matches! Login should work.');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLogin();
