/**
 * One-time script to sync all menu item availability based on current ingredient stock
 * Run this after implementing the automatic availability update feature
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const Item = require('./models/Items');
const MenuItemIngredient = require('./models/MenuItemIngredient');
const InventoryAvailabilityService = require('./services/inventoryAvailabilityService');

async function syncMenuAvailability() {
  try {
    // Connect to MongoDB using the same connection as the server
    const mongoUri = process.env.MONGO_URI || 'mongodb://admin:admin@localhost:27017/admin_db?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all menu items
    const menuItems = await MenuItem.find({});
    console.log(`\n📋 Found ${menuItems.length} menu items to check`);

    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    for (const menuItem of menuItems) {
      try {
        // Check availability for this menu item
        const availabilityCheck = await InventoryAvailabilityService.checkMenuItemAvailability(
          menuItem._id,
          1
        );

        const currentAvailability = menuItem.isAvailable;
        const newAvailability = availabilityCheck.isAvailable;

        if (currentAvailability !== newAvailability) {
          // Update the menu item
          menuItem.isAvailable = newAvailability;
          await menuItem.save();
          
          console.log(`✅ Updated: ${menuItem.name}`);
          console.log(`   ${currentAvailability ? 'Available' : 'Unavailable'} → ${newAvailability ? 'Available' : 'Unavailable'}`);
          
          if (!newAvailability && availabilityCheck.insufficientIngredients) {
            console.log(`   Reason: Insufficient ingredients -`, 
              availabilityCheck.insufficientIngredients.map(i => i.ingredientName).join(', ')
            );
          }
          
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } catch (error) {
        console.error(`❌ Error checking ${menuItem.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Sync Complete!');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updatedCount} items`);
    console.log(`➖ Unchanged: ${unchangedCount} items`);
    console.log(`❌ Errors: ${errorCount} items`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

// Run the sync
syncMenuAvailability();
