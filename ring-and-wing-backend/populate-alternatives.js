/**
 * Test script to populate alternatives for menu items
 * This will help us test the alternatives feature
 */

const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');

async function populateAlternatives() {
  try {
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/ring-and-wing');
    console.log('Connected to database');

    // Get all menu items
    const items = await MenuItem.find({});
    console.log(`Found ${items.length} menu items`);

    // Group items by category
    const meals = items.filter(item => item.category === 'Meals');
    const beverages = items.filter(item => item.category === 'Beverages');

    console.log(`Found ${meals.length} meals and ${beverages.length} beverages`);

    // For each meal, set alternatives to other meals
    for (const meal of meals) {
      const otherMeals = meals.filter(m => m._id.toString() !== meal._id.toString()).slice(0, 3);
      const alternatives = otherMeals.map(m => m._id);
      const recommendedAlternative = alternatives.length > 0 ? alternatives[0] : null;

      await MenuItem.findByIdAndUpdate(meal._id, {
        alternatives,
        recommendedAlternative
      });

      console.log(`Updated ${meal.name} with ${alternatives.length} alternatives`);
    }

    // For each beverage, set alternatives to other beverages
    for (const beverage of beverages) {
      const otherBeverages = beverages.filter(b => b._id.toString() !== beverage._id.toString()).slice(0, 3);
      const alternatives = otherBeverages.map(b => b._id);
      const recommendedAlternative = alternatives.length > 0 ? alternatives[0] : null;

      await MenuItem.findByIdAndUpdate(beverage._id, {
        alternatives,
        recommendedAlternative
      });

      console.log(`Updated ${beverage.name} with ${alternatives.length} alternatives`);
    }

    console.log('✅ Alternatives populated successfully!');

    // Set a few items as unavailable for testing
    const testUnavailableItems = items.slice(0, 2);
    for (const item of testUnavailableItems) {
      await MenuItem.findByIdAndUpdate(item._id, { isAvailable: false });
      console.log(`Set ${item.name} as unavailable for testing`);
    }

    console.log('✅ Test data setup complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

populateAlternatives();
