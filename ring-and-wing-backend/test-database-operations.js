/**
 * Database Operations Validation Script
 * Tests MongoDB operations, indexes, transactions, and data integrity
 */

const mongoose = require('mongoose');
const MenuItemIngredient = require('./models/MenuItemIngredient');
const InventoryReservation = require('./models/InventoryReservation');
const InventoryAdjustment = require('./models/InventoryAdjustment');
const Item = require('./models/Items');
const MenuItem = require('./models/MenuItem');

// Test utilities
const testResults = [];
function logTest(testName, success, details = '', duration = 0) {
  const status = success ? '✅ PASSED' : '❌ FAILED';
  const result = `${status} ${testName}${details ? ' - ' + details : ''}${duration ? ` (${duration}ms)` : ''}`;
  console.log(result);
  testResults.push({ testName, success, details, duration });
}

async function connectDatabase() {
  try {
    // Use the same connection as the main app
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect('mongodb://admin:admin@localhost:27017/admin_db?authSource=admin', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
    }
    console.log('🔗 Database connected for testing\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test 1: Index Validation
 * Verify that all expected indexes exist and are being used
 */
async function testIndexes() {
  console.log('📊 Testing Database Indexes...\n');
  
  try {
    // Test MenuItemIngredient indexes
    const menuItemIngredientIndexes = await MenuItemIngredient.collection.getIndexes();
    const hasUniqueIndex = Object.keys(menuItemIngredientIndexes).some(indexName => 
      indexName.includes('menuItemId') && indexName.includes('ingredientId')
    );
    logTest('MenuItemIngredient Unique Index', hasUniqueIndex, 'menuItemId + ingredientId compound index');

    // Test InventoryReservation indexes
    const reservationIndexes = await InventoryReservation.collection.getIndexes();
    const hasOrderIdIndex = Object.keys(reservationIndexes).some(indexName => 
      indexName.includes('orderId')
    );
    logTest('InventoryReservation OrderId Index', hasOrderIdIndex, 'orderId index for fast lookups');

    // Test InventoryAdjustment indexes  
    const adjustmentIndexes = await InventoryAdjustment.collection.getIndexes();
    const hasTimestampIndex = Object.keys(adjustmentIndexes).some(indexName => 
      indexName.includes('createdAt')
    );
    logTest('InventoryAdjustment Timestamp Index', hasTimestampIndex, 'createdAt index for date queries');

    // Test Item indexes
    const itemIndexes = await Item.collection.getIndexes();
    logTest('Item Collection Indexes', Object.keys(itemIndexes).length > 1, `${Object.keys(itemIndexes).length} indexes found`);

  } catch (error) {
    logTest('Index Validation', false, error.message);
  }
}

/**
 * Test 2: Data Integrity & Validation
 * Test model validation rules and data integrity constraints
 */
async function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity & Validation...\n');
  
  try {
    // Test MenuItemIngredient validation
    const startTime = Date.now();
    
    // Test required field validation
    try {
      const invalidIngredient = new MenuItemIngredient({
        // Missing required fields
        quantity: 0.5
      });
      await invalidIngredient.save();
      logTest('MenuItemIngredient Validation', false, 'Should have failed validation');
    } catch (validationError) {
      logTest('MenuItemIngredient Required Fields', true, 'Properly validates required fields');
    }

    // Test valid ingredient creation
    const validIngredient = new MenuItemIngredient({
      menuItemId: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e'),
      ingredientId: new mongoose.Types.ObjectId('6850112119d18e61e1cddeb6'),
      quantity: 0.5,
      unit: 'kg',
      createdBy: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e'),
      lastModifiedBy: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e')
    });
    
    await validIngredient.save();
    logTest('MenuItemIngredient Valid Creation', true, 'Created with all required fields');
    
    // Test duplicate prevention (unique index)
    try {
      const duplicateIngredient = new MenuItemIngredient({
        menuItemId: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e'),
        ingredientId: new mongoose.Types.ObjectId('6850112119d18e61e1cddeb6'),
        quantity: 1.0,
        unit: 'kg',
        createdBy: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e'),
        lastModifiedBy: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e')
      });
      await duplicateIngredient.save();
      logTest('Unique Index Constraint', false, 'Should have prevented duplicate');
    } catch (duplicateError) {
      logTest('Unique Index Constraint', true, 'Prevents duplicate menu-ingredient mappings');
    }

    // Clean up test data
    await MenuItemIngredient.deleteMany({
      menuItemId: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e'),
      ingredientId: new mongoose.Types.ObjectId('6850112119d18e61e1cddeb6')
    });

    const duration = Date.now() - startTime;
    logTest('Data Integrity Test Suite', true, '', duration);

  } catch (error) {
    logTest('Data Integrity', false, error.message);
  }
}

/**
 * Test 3: Transaction Handling
 * Test MongoDB transactions for atomic operations
 */
async function testTransactions() {
  console.log('\n💾 Testing Transaction Handling...\n');
  
  const session = await mongoose.startSession();
  
  try {
    const startTime = Date.now();
    
    // Test successful transaction
    await session.withTransaction(async () => {
      const testReservation = new InventoryReservation({
        orderId: 'test-transaction-order',
        items: [{
          ingredientId: new mongoose.Types.ObjectId('6850112119d18e61e1cddeb6'),
          quantity: 2.0,
          unit: 'kg'
        }],
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        createdBy: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e')
      });
      
      await testReservation.save({ session });
    });
    
    // Verify transaction was committed
    const savedReservation = await InventoryReservation.findOne({ orderId: 'test-transaction-order' });
    logTest('Transaction Commit', !!savedReservation, 'Transaction successfully committed');
    
    // Test transaction rollback
    try {
      await session.withTransaction(async () => {
        const testAdjustment = new InventoryAdjustment({
          inventoryItemId: new mongoose.Types.ObjectId('6850112119d18e61e1cddeb6'),
          adjustmentType: 'usage',
          quantity: 1.0,
          reason: 'Test transaction rollback',
          performedBy: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e')
        });
        
        await testAdjustment.save({ session });
        
        // Force an error to trigger rollback
        throw new Error('Intentional error to test rollback');
      });
    } catch (rollbackError) {
      // Verify rollback worked - adjustment should not exist
      const rolledBackAdjustment = await InventoryAdjustment.findOne({ reason: 'Test transaction rollback' });
      logTest('Transaction Rollback', !rolledBackAdjustment, 'Transaction properly rolled back on error');
    }
    
    // Clean up test data
    await InventoryReservation.deleteOne({ orderId: 'test-transaction-order' });
    
    const duration = Date.now() - startTime;
    logTest('Transaction Test Suite', true, '', duration);
    
  } catch (error) {
    logTest('Transaction Handling', false, error.message);
  } finally {
    await session.endSession();
  }
}

/**
 * Test 4: Query Performance
 * Test query performance and optimization
 */
async function testQueryPerformance() {
  console.log('\n⚡ Testing Query Performance...\n');
  
  try {
    // Test MenuItemIngredient lookup performance
    const startTime1 = Date.now();
    await MenuItemIngredient.find({ 
      menuItemId: new mongoose.Types.ObjectId('683c2408ec6a7e4a45a6fa0e') 
    }).explain('executionStats');
    const duration1 = Date.now() - startTime1;
    logTest('MenuItemIngredient Query', duration1 < 100, `Query completed in ${duration1}ms`);
    
    // Test aggregation pipeline performance
    const startTime2 = Date.now();
    const aggregationResult = await MenuItemIngredient.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: '$menuItemId', 
        ingredientCount: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }},
      { $limit: 10 }
    ]);
    const duration2 = Date.now() - startTime2;
    logTest('Aggregation Pipeline', duration2 < 200, `Aggregation completed in ${duration2}ms`);
    
    // Test populate performance
    const startTime3 = Date.now();
    await MenuItemIngredient.find({ isActive: true })
      .populate('ingredientId', 'name unit')
      .limit(5);
    const duration3 = Date.now() - startTime3;
    logTest('Populate Query', duration3 < 150, `Populate query completed in ${duration3}ms`);
    
  } catch (error) {
    logTest('Query Performance', false, error.message);
  }
}

/**
 * Test 5: Connection Resilience
 * Test database connection handling and resilience
 */
async function testConnectionResilience() {
  console.log('\n🔌 Testing Connection Resilience...\n');
  
  try {
    // Test connection state
    const connectionState = mongoose.connection.readyState;
    const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    logTest('Connection State', connectionState === 1, `State: ${stateNames[connectionState]}`);
    
    // Test connection pools
    const db = mongoose.connection.db;
    if (db) {
      logTest('Database Instance', true, 'Database instance available');
    }
    
    // Test collection access
    const collections = Object.keys(mongoose.connection.collections);
    logTest('Collection Access', collections.length > 0, `${collections.length} collections accessible`);
    
  } catch (error) {
    logTest('Connection Resilience', false, error.message);
  }
}

/**
 * Main test runner
 */
async function runDatabaseTests() {
  console.log('🧪 Starting Database Operations Validation\n');
  console.log('===================================================\n');
  
  await connectDatabase();
  
  // Run all test suites
  await testIndexes();
  await testDataIntegrity();
  await testTransactions();
  await testQueryPerformance();
  await testConnectionResilience();
  
  // Summary
  console.log('\n===================================================');
  console.log('🏁 Database Testing Complete\n');
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(result => result.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`📊 Results Summary:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);
  
  if (failedTests > 0) {
    console.log('❌ Failed Tests:');
    testResults.filter(result => !result.success).forEach(result => {
      console.log(`   - ${result.testName}: ${result.details}`);
    });
  }
  
  // Close connection
  await mongoose.connection.close();
  console.log('🔒 Database connection closed\n');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runDatabaseTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runDatabaseTests };