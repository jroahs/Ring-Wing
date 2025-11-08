require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Admin Account Seeder
 * 
 * This script creates or resets the default admin account.
 * Run this when setting up the system for the first time or to reset admin credentials.
 * 
 * Usage: node seeds/admin-seeder.js
 */

const ADMIN_ACCOUNTS = [
  {
    username: 'admin',
    email: 'admin@ringandwing.com',
    password: 'Admin@123',  // Will be hashed by pre-save hook
    role: 'manager',
    position: 'admin'
  }
];

async function seedAdmin() {
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('         ADMIN ACCOUNT SEEDER');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📡 Connecting to MongoDB...');
    console.log(`   Database: ${process.env.MONGO_URI?.split('@')[1] || 'Unknown'}\n`);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected successfully\n');
    console.log('───────────────────────────────────────────────────\n');

    for (const adminData of ADMIN_ACCOUNTS) {
      console.log(`🔍 Checking for existing user: ${adminData.username}`);
      
      // Check if user already exists
      const existingUser = await User.findOne({ username: adminData.username });
      
      if (existingUser) {
        console.log(`⚠️  User "${adminData.username}" already exists`);
        console.log(`   Resetting password to: ${adminData.password}`);
        
        // Update the password (pre-save hook will hash it)
        existingUser.password = adminData.password;
        existingUser.email = adminData.email;
        existingUser.role = adminData.role;
        existingUser.position = adminData.position;
        await existingUser.save();
        
        console.log(`✅ Password reset successfully\n`);
      } else {
        console.log(`➕ Creating new admin user: ${adminData.username}`);
        
        // Create new user (pre-save hook will hash password)
        const newUser = new User(adminData);
        await newUser.save();
        
        console.log(`✅ Admin user created successfully\n`);
      }
      
      // Verify the user
      const verifiedUser = await User.findOne({ username: adminData.username }).select('+password');
      console.log('📋 User Details:');
      console.log(`   Username: ${verifiedUser.username}`);
      console.log(`   Email:    ${verifiedUser.email}`);
      console.log(`   Role:     ${verifiedUser.role}`);
      console.log(`   Position: ${verifiedUser.position}`);
      console.log(`   Password Hash Length: ${verifiedUser.password?.length || 0}`);
      console.log(`   Created:  ${verifiedUser.createdAt}`);
      console.log('');
    }
    
    console.log('───────────────────────────────────────────────────\n');
    console.log('✅ SEEDING COMPLETE\n');
    console.log('📝 Login Credentials:');
    ADMIN_ACCOUNTS.forEach((admin, idx) => {
      console.log(`   ${idx + 1}. Username: ${admin.username}`);
      console.log(`      Password: ${admin.password}`);
      console.log('');
    });
    console.log('═══════════════════════════════════════════════════\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ SEEDING FAILED\n');
    console.error('Error:', error.message);
    console.error('\nStack Trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the seeder
seedAdmin();
