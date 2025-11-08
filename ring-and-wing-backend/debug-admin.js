require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function debugAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully\n');

    // Get the raw admin user from database
    console.log('=== RAW DATABASE QUERY ===');
    const adminRaw = await mongoose.connection.db.collection('users').findOne({ username: 'admin' });
    console.log('Raw admin document:', JSON.stringify(adminRaw, null, 2));
    
    console.log('\n=== MONGOOSE QUERY (with password) ===');
    const adminWithPassword = await User.findOne({ username: 'admin' }).select('+password');
    
    if (adminWithPassword) {
      console.log('Username:', adminWithPassword.username);
      console.log('Email:', adminWithPassword.email);
      console.log('Role:', adminWithPassword.role);
      console.log('Password field exists:', !!adminWithPassword.password);
      console.log('Password value:', adminWithPassword.password);
      console.log('Password length:', adminWithPassword.password?.length);
    } else {
      console.log('Admin user not found via Mongoose');
    }
    
    console.log('\n=== ALL USERS ===');
    const allUsers = await User.find({}).select('+password');
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.username} (${user.role}) - Has password: ${!!user.password} - Length: ${user.password?.length}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugAdmin();
