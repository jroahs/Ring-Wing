const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');

async function swapCategorySortOrder() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to database');

    // Get categories
    const meals = await Category.findOne({ name: 'Meals' });
    const beverages = await Category.findOne({ name: 'Beverages' });

    if (!meals || !beverages) {
      console.log('❌ Could not find both categories');
      return;
    }

    console.log(`\nCurrent sort order:`);
    console.log(`  Meals: ${meals.sortOrder}`);
    console.log(`  Beverages: ${beverages.sortOrder}`);

    // Set Meals first (0), Beverages second (1)
    meals.sortOrder = 0;
    beverages.sortOrder = 1;

    await meals.save();
    await beverages.save();

    console.log(`\n✅ Updated sort order:`);
    console.log(`  Meals: ${meals.sortOrder} (now first)`);
    console.log(`  Beverages: ${beverages.sortOrder} (now second)`);

    // Verify
    const allCategories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    console.log(`\n========== VERIFICATION ==========`);
    allCategories.forEach(cat => {
      console.log(`${cat.sortOrder}. ${cat.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

swapCategorySortOrder();
