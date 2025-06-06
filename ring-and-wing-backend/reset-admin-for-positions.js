require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function resetAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to database');

    // Find and update existing admin user or create new one
    let admin = await User.findOne({ username: 'admin' });
    
    if (admin) {
      console.log('👤 Found existing admin user, updating...');
      
      // Update with new position hierarchy
      admin.role = 'manager';
      admin.position = 'admin';
      admin.password = 'manager123'; // Will trigger password hashing
      await admin.save();
      
      console.log('✅ Admin user updated successfully');
    } else {
      console.log('👤 No existing admin found, creating new admin...');
      
      // Create new admin
      admin = await User.create({
        username: 'admin',
        email: 'admin@ringwing.com',
        password: 'manager123',
        role: 'manager',
        position: 'admin'
      });
      
      console.log('✅ New admin user created successfully');
    }

    // Verify the admin user
    const verifyAdmin = await User.findOne({ username: 'admin' }).lean();
    
    console.log('\n📋 Admin User Details:');
    console.log('┌──────────────┬─────────────────────────────────────┐');
    console.log('│ Field        │ Value                               │');
    console.log('├──────────────┼─────────────────────────────────────┤');
    console.log(`│ Username     │ ${verifyAdmin.username.padEnd(35)} │`);
    console.log(`│ Email        │ ${verifyAdmin.email.padEnd(35)} │`);
    console.log(`│ Role         │ ${verifyAdmin.role.padEnd(35)} │`);
    console.log(`│ Position     │ ${verifyAdmin.position.padEnd(35)} │`);
    console.log(`│ Password     │ manager123 (raw)                   │`);
    console.log('└──────────────┴─────────────────────────────────────┘');

    console.log('\n🎯 Admin Access Permissions:');
    console.log('✅ Dashboard');
    console.log('✅ POS/Orders');
    console.log('✅ Inventory Management');
    console.log('✅ Menu Management');
    console.log('✅ Staff Management');
    console.log('✅ Payroll System');
    console.log('✅ Expense Tracking');
    console.log('✅ Revenue Reports');
    console.log('✅ System Settings');
    console.log('✅ AI Assistant');

    console.log('\n✅ Admin user is ready for the new position-based system!');
    
    process.exit();
  } catch (err) {
    console.error('❌ Error resetting admin user:', err);
    process.exit(1);
  }
}

resetAdminUser();
