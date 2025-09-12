const mongoose = require('mongoose');
const Category = require('./models/Category');
const AddOn = require('./models/AddOn');

async function testAPI() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing');
    console.log('Connected to MongoDB for API test');

    // Test getCategoriesWithConfig
    console.log('\n=== Testing getCategoriesWithConfig ===');
    const configCategories = await Category.getCategoriesWithConfig();
    console.log(`Found ${configCategories.length} categories`);
    
    configCategories.forEach(cat => {
      console.log(`\nCategory: ${cat.name} (${cat.displayName})`);
      console.log(`- Sort Order: ${cat.sortOrder}`);
      console.log(`- Active: ${cat.isActive}`);
      console.log(`- Subcategories: ${cat.subCategories.length}`);
      
      cat.subCategories.forEach((sub, idx) => {
        console.log(`  ${idx + 1}. ${sub.name} - Sizes: ${sub.sizes.length}, Addons: ${sub.availableAddons.length}`);
      });
    });

    // Test getSimpleCategories
    console.log('\n=== Testing getSimpleCategories ===');
    const simpleCategories = await Category.getSimpleCategories();
    console.log(`Found ${simpleCategories.length} categories`);
    
    console.log('Simple format:');
    console.log(JSON.stringify(simpleCategories, null, 2));

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
