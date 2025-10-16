const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');

// Menu configuration from frontend
const MENU_CONFIG = {
  Beverages: {
    subCategories: [
      'Coffee',
      'Non-Coffee (Milk-Based)',
      'Fruit Tea',
      'Fruit Soda',
      'Yogurt Smoothies',
      'Fresh Lemonade',
      'Frappe',
      'Milktea' // Added based on console logs showing 8 subcategories
    ]
  },
  Meals: {
    subCategories: [
      'Breakfast All Day',
      'Wings & Sides',
      'Rice Meals',
      'Flavored Wings', // Added based on console logs showing 5 subcategories
      'Combos'
    ]
  }
};

async function seedSubcategories() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to database');

    // Get existing categories
    const categories = await Category.find({});
    console.log(`\nFound ${categories.length} categories in database`);

    // Update each category with subcategories
    for (const category of categories) {
      const categoryName = category.name;
      const config = MENU_CONFIG[categoryName];

      if (!config) {
        console.log(`⚠ No config found for category: ${categoryName}`);
        continue;
      }

      const subCategories = config.subCategories.map((name, index) => ({
        name: name,
        displayName: name,
        sortOrder: index,
        isActive: true,
        description: `${name} items from ${categoryName}`,
        sizes: [],
        availableAddons: [],
        rules: {
          requiresSize: name === 'Coffee' || name === 'Non-Coffee (Milk-Based)' || name === 'Milktea',
          allowMultipleSizes: false,
          defaultPreparationTime: 15,
          hasAddons: name === 'Milktea' || categoryName === 'Meals'
        }
      }));

      console.log(`\n📝 Updating ${categoryName} with ${subCategories.length} subcategories:`);
      subCategories.forEach(sub => console.log(`   - ${sub.name}`));

      // Update the category
      category.subCategories = subCategories;
      await category.save();

      console.log(`✓ Successfully updated ${categoryName}`);
    }

    console.log('\n✓ All categories updated successfully!\n');

    // Verify the update
    console.log('=== VERIFICATION ===\n');
    const updatedCategories = await Category.find({}).sort({ sortOrder: 1 });
    
    for (const cat of updatedCategories) {
      console.log(`${cat.name} (${cat._id})`);
      console.log(`  Sort Order: ${cat.sortOrder}`);
      console.log(`  Active: ${cat.isActive}`);
      console.log(`  Subcategories (${cat.subCategories.length}):`);
      
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach(sub => {
          console.log(`    - ${sub.name} (ID: ${sub._id})`);
          console.log(`      Display Name: ${sub.displayName}`);
          console.log(`      Active: ${sub.isActive}`);
          console.log(`      Sort Order: ${sub.sortOrder}`);
        });
      } else {
        console.log('    (no subcategories)');
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedSubcategories();
