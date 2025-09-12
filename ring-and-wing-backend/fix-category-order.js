const mongoose = require('mongoose');
const Category = require('./models/Category');

async function fixCategoryOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing');
    console.log('Connected to MongoDB');

    // Check current sort order
    const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 });
    console.log('Current categories order:');
    categories.forEach(cat => {
      console.log(`- ${cat.name}: sortOrder = ${cat.sortOrder}`);
    });

    // Update sort order to ensure Meals comes first (sortOrder: 0), Beverages second (sortOrder: 1)
    await Category.updateOne({ name: 'Meals' }, { sortOrder: 0 });
    await Category.updateOne({ name: 'Beverages' }, { sortOrder: 1 });
    
    console.log('\nUpdated sort order:');
    const updatedCategories = await Category.find({}).sort({ sortOrder: 1, name: 1 });
    updatedCategories.forEach(cat => {
      console.log(`- ${cat.name}: sortOrder = ${cat.sortOrder}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixCategoryOrder();
