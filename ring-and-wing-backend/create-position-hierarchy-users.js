require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createPositionHierarchyUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to database');

    // Delete existing test users
    await User.deleteMany({ 
      $or: [
        { username: 'testadmin' },
        { username: 'testgeneralmanager' },
        { username: 'testshiftmanager' },
        { username: 'testinventory' },
        { username: 'testcashier' }
      ] 
    });
    console.log('🧹 Cleaned existing test users');

    // Create Admin user
    const admin = await User.create({
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'manager',
      position: 'admin'
    });
    console.log(`✅ Admin created: ${admin.username} (Position: ${admin.position})`);

    // Create General Manager
    const generalManager = await User.create({
      username: 'testgeneralmanager',
      email: 'generalmanager@test.com',
      password: 'gmanager123',
      role: 'manager',
      position: 'general_manager'
    });
    console.log(`✅ General Manager created: ${generalManager.username} (Position: ${generalManager.position})`);

    // Create Shift Manager
    const shiftManager = await User.create({
      username: 'testshiftmanager',
      email: 'shiftmanager@test.com',
      password: 'smanager123',
      role: 'manager',
      position: 'shift_manager'
    });
    console.log(`✅ Shift Manager created: ${shiftManager.username} (Position: ${shiftManager.position})`);

    // Create Inventory Staff
    const inventoryStaff = await User.create({
      username: 'testinventory',
      email: 'inventory@test.com',
      password: 'inventory123',
      role: 'staff',
      position: 'inventory',
      reportsTo: generalManager._id
    });
    console.log(`✅ Inventory Staff created: ${inventoryStaff.username} (Position: ${inventoryStaff.position})`);

    // Create Cashier
    const cashier = await User.create({
      username: 'testcashier',
      email: 'cashier@test.com',
      password: 'cashier123',
      role: 'staff',
      position: 'cashier',
      reportsTo: shiftManager._id
    });
    console.log(`✅ Cashier created: ${cashier.username} (Position: ${cashier.position})`);

    // Summary table
    console.log('\n📋 Position Hierarchy Test Users Created:');
    console.log('┌─────────────────────┬─────────────────────┬─────────┬──────────────────┬─────────────┐');
    console.log('│ Username            │ Email               │ Role    │ Position         │ Password    │');
    console.log('├─────────────────────┼─────────────────────┼─────────┼──────────────────┼─────────────┤');
    console.log(`│ testadmin           │ admin@test.com      │ manager │ admin            │ admin123    │`);
    console.log(`│ testgeneralmanager  │ generalmanager@...  │ manager │ general_manager  │ gmanager123 │`);
    console.log(`│ testshiftmanager    │ shiftmanager@...    │ manager │ shift_manager    │ smanager123 │`);
    console.log(`│ testinventory       │ inventory@test.com  │ staff   │ inventory        │ inventory123│`);
    console.log(`│ testcashier         │ cashier@test.com    │ staff   │ cashier          │ cashier123  │`);
    console.log('└─────────────────────┴─────────────────────┴─────────┴──────────────────┴─────────────┘');

    console.log('\n🎯 Access Permissions by Position:');
    console.log('Admin: Full system access');
    console.log('General Manager: Dashboard, POS, Inventory, Menu, Staff, Reports');
    console.log('Shift Manager: Dashboard, POS, Inventory, Menu, Staff, Reports');
    console.log('Inventory Staff: POS, Inventory only');
    console.log('Cashier: POS only');

    console.log('\n✅ All position hierarchy test users created successfully!');
    
    process.exit();
  } catch (err) {
    console.error('❌ Error creating position hierarchy users:', err);
    process.exit(1);
  }
}

createPositionHierarchyUsers();
