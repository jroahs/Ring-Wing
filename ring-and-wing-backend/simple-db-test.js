/**
 * Simple Database Operations Test
 */

const mongoose = require('mongoose');

async function testDatabaseOperations() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Connect to database
    await mongoose.connect('mongodb://admin:admin@localhost:27017/admin_db?authSource=admin', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ Database connected successfully');
    
    // Test 1: Check collections
    const collections = Object.keys(mongoose.connection.collections);
    console.log(`📊 Found ${collections.length} collections: ${collections.join(', ')}`);
    
    // Test 2: Check MenuItemIngredient indexes
    const MenuItemIngredient = require('./models/MenuItemIngredient');
    const indexes = await MenuItemIngredient.collection.getIndexes();
    console.log(`📋 MenuItemIngredient indexes:`, Object.keys(indexes));
    
    // Test 3: Test basic query
    const ingredientCount = await MenuItemIngredient.countDocuments();
    console.log(`🧮 MenuItemIngredient documents: ${ingredientCount}`);
    
    // Test 4: Test validation
    console.log('🔍 Testing validation...');
    try {
      const testDoc = new MenuItemIngredient({
        quantity: 0.5 // Missing required fields
      });
      await testDoc.validate();
      console.log('❌ Validation should have failed');
    } catch (validationError) {
      console.log('✅ Validation working correctly');
    }
    
    console.log('\n🎉 Database operations test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
}

testDatabaseOperations();