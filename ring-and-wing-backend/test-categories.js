const mongoose = require('mongoose');
const Category = require('./models/Category');

async function testDatabase() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing');
    console.log('Connected to MongoDB');

    // Test direct query
    const categories = await Category.find({});
    console.log(`Found ${categories.length} categories in database`);
    
    categories.forEach(cat => {
      console.log(`- ${cat.name} (active: ${cat.isActive})`);
    });

    // Test the static methods
    console.log('\nTesting static methods:');
    
    const configCategories = await Category.getCategoriesWithConfig();
    console.log(`getCategoriesWithConfig returned ${configCategories.length} categories`);
    
    const simpleCategories = await Category.getSimpleCategories();
    console.log(`getSimpleCategories returned ${simpleCategories.length} categories`);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testDatabase();
