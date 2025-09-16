const mongoose = require('mongoose');
require('dotenv').config();

// Import models to ensure schemas are registered
const MenuItemIngredient = require('./models/MenuItemIngredient');
const InventoryReservation = require('./models/InventoryReservation');
const InventoryAdjustment = require('./models/InventoryAdjustment');

async function createInventoryIntegrationIndexes() {
  try {
    console.log('🚀 Starting inventory integration database setup...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/admin_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Create indexes for MenuItemIngredient
    console.log('📋 Creating MenuItemIngredient indexes...');
    const menuItemIngredientIndexes = [
      { menuItemId: 1, ingredientId: 1 }, // Unique compound index
      { ingredientId: 1, isActive: 1 },
      { menuItemId: 1, isActive: 1 },
      { createdBy: 1, createdAt: -1 }
    ];
    
    for (const index of menuItemIngredientIndexes) {
      try {
        if (index.menuItemId && index.ingredientId) {
          await MenuItemIngredient.collection.createIndex(index, { unique: true, background: true });
          console.log(`  ✅ Created unique compound index: ${Object.keys(index).join(', ')}`);
        } else {
          await MenuItemIngredient.collection.createIndex(index, { background: true });
          console.log(`  ✅ Created index: ${Object.keys(index).join(', ')}`);
        }
      } catch (error) {
        if (error.code === 85) {
          console.log(`  ⚠️  Index already exists: ${Object.keys(index).join(', ')}`);
        } else {
          console.error(`  ❌ Failed to create index ${Object.keys(index).join(', ')}:`, error.message);
        }
      }
    }
    
    // Create indexes for InventoryReservation
    console.log('\n📦 Creating InventoryReservation indexes...');
    const inventoryReservationIndexes = [
      { orderId: 1 }, // Unique index
      { expiresAt: 1 }, // TTL index (handled by schema, but ensuring it exists)
      { status: 1, createdAt: -1 },
      { createdBy: 1, createdAt: -1 },
      { 'reservations.ingredientId': 1, status: 1 },
      { totalReservedValue: -1 },
      { expiresAt: 1, status: 1 }
    ];
    
    for (const index of inventoryReservationIndexes) {
      try {
        if (index.orderId) {
          await InventoryReservation.collection.createIndex(index, { unique: true, background: true });
          console.log(`  ✅ Created unique index: ${Object.keys(index).join(', ')}`);
        } else if (index.expiresAt && Object.keys(index).length === 1) {
          // TTL index - handled by schema but ensuring proper setup
          await InventoryReservation.collection.createIndex(index, { 
            expireAfterSeconds: 0, 
            background: true 
          });
          console.log(`  ✅ Created TTL index: ${Object.keys(index).join(', ')}`);
        } else {
          await InventoryReservation.collection.createIndex(index, { background: true });
          console.log(`  ✅ Created index: ${Object.keys(index).join(', ')}`);
        }
      } catch (error) {
        if (error.code === 85) {
          console.log(`  ⚠️  Index already exists: ${Object.keys(index).join(', ')}`);
        } else {
          console.error(`  ❌ Failed to create index ${Object.keys(index).join(', ')}:`, error.message);
        }
      }
    }
    
    // Create indexes for InventoryAdjustment
    console.log('\n📊 Creating InventoryAdjustment indexes...');
    const inventoryAdjustmentIndexes = [
      { timestamp: -1 },
      { performedBy: 1, timestamp: -1 },
      { referenceType: 1, timestamp: -1 },
      { 'adjustments.itemId': 1, timestamp: -1 },
      { referenceId: 1, referenceType: 1 },
      { totalValueImpact: -1 },
      { systemGenerated: 1, timestamp: -1 },
      { 'complianceFlags.type': 1, 'complianceFlags.resolved': 1 }
    ];
    
    for (const index of inventoryAdjustmentIndexes) {
      try {
        await InventoryAdjustment.collection.createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${Object.keys(index).join(', ')}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`  ⚠️  Index already exists: ${Object.keys(index).join(', ')}`);
        } else {
          console.error(`  ❌ Failed to create index ${Object.keys(index).join(', ')}:`, error.message);
        }
      }
    }
    
    // Verify indexes were created successfully
    console.log('\n🔍 Verifying indexes...');
    
    const menuIngredientIndexes = await MenuItemIngredient.collection.getIndexes();
    const reservationIndexes = await InventoryReservation.collection.getIndexes();
    const adjustmentIndexes = await InventoryAdjustment.collection.getIndexes();
    
    console.log(`  📋 MenuItemIngredient has ${Object.keys(menuIngredientIndexes).length} indexes`);
    console.log(`  📦 InventoryReservation has ${Object.keys(reservationIndexes).length} indexes`);
    console.log(`  📊 InventoryAdjustment has ${Object.keys(adjustmentIndexes).length} indexes`);
    
    // Check for critical indexes
    console.log('\n✅ Verifying critical indexes...');
    
    // Check MenuItemIngredient unique compound index
    const hasMenuIngredientUnique = Object.keys(menuIngredientIndexes).some(key => 
      key.includes('menuItemId') && key.includes('ingredientId')
    );
    console.log(`  ${hasMenuIngredientUnique ? '✅' : '❌'} MenuItemIngredient unique compound index`);
    
    // Check InventoryReservation unique orderId index
    const hasReservationUnique = Object.keys(reservationIndexes).some(key => 
      key.includes('orderId') && reservationIndexes[key].unique
    );
    console.log(`  ${hasReservationUnique ? '✅' : '❌'} InventoryReservation unique orderId index`);
    
    // Check TTL index
    const hasTTLIndex = Object.keys(reservationIndexes).some(key => 
      key.includes('expiresAt') && reservationIndexes[key].expireAfterSeconds !== undefined
    );
    console.log(`  ${hasTTLIndex ? '✅' : '❌'} InventoryReservation TTL index`);
    
    // Collection stats
    console.log('\n📈 Collection Statistics:');
    
    const collections = [
      { name: 'MenuItemIngredient', model: MenuItemIngredient },
      { name: 'InventoryReservation', model: InventoryReservation },
      { name: 'InventoryAdjustment', model: InventoryAdjustment }
    ];
    
    for (const collection of collections) {
      try {
        const stats = await collection.model.collection.stats();
        const count = await collection.model.countDocuments();
        console.log(`  📊 ${collection.name}:`);
        console.log(`     Documents: ${count}`);
        console.log(`     Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
        console.log(`     Index Size: ${(stats.totalIndexSize / 1024).toFixed(2)} KB`);
      } catch (error) {
        console.log(`  📊 ${collection.name}: Collection not yet created (0 documents)`);
      }
    }
    
    console.log('\n🎉 Inventory integration database setup completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Start implementing API endpoints');
    console.log('  2. Create availability calculation service');
    console.log('  3. Build reservation system with transaction safety');
    console.log('  4. Implement audit trail service');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle script execution
if (require.main === module) {
  createInventoryIntegrationIndexes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = createInventoryIntegrationIndexes;