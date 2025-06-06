const mongoose = require('mongoose');
require('dotenv').config();

// Import the updated User model
const User = require('./models/User');

async function migrateUserPositions() {
  try {    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Find all users without a position field
    const usersWithoutPosition = await User.find({ 
      position: { $exists: false } 
    });

    console.log(`Found ${usersWithoutPosition.length} users without position field`);

    // Update each user with a default position based on their role
    for (const user of usersWithoutPosition) {
      let defaultPosition = 'cashier';
      
      // If the user is a manager, set position to manager
      if (user.role === 'manager') {
        defaultPosition = 'manager';
      }
      
      await User.findByIdAndUpdate(user._id, { 
        position: defaultPosition 
      });
      
      console.log(`Updated user ${user.username} with position: ${defaultPosition}`);
    }

    // Also check existing staff records to suggest positions
    const Staff = require('./models/Staff');
    const staffRecords = await Staff.find().populate('userId');
    
    console.log('\nSuggested position mappings based on Staff records:');
    for (const staff of staffRecords) {
      if (staff.userId) {
        let suggestedPosition = 'cashier';
        
        // Map staff positions to user positions
        switch (staff.position) {
          case 'Manager':
            suggestedPosition = 'manager';
            break;
          case 'Cashier':
            suggestedPosition = 'cashier';
            break;
          case 'Barista':
          case 'Chef':
          case 'Cook':
            suggestedPosition = 'inventory'; // Kitchen staff often handle inventory
            break;
          case 'Server':
            suggestedPosition = 'cashier';
            break;
          default:
            suggestedPosition = 'cashier';
        }
        
        // Update the user's position based on staff record
        await User.findByIdAndUpdate(staff.userId._id, { 
          position: suggestedPosition 
        });
        
        console.log(`${staff.name} (${staff.position}) -> User position: ${suggestedPosition}`);
      }
    }

    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
migrateUserPositions();
