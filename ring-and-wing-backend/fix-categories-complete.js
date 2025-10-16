const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');

// Menu configuration from frontend
const MENU_CONFIG = {
  Beverages: {
    displayName: 'Beverages',
    sortOrder: 1,
    subCategories: [
      'Coffee',
      'Non-Coffee (Milk-Based)',
      'Fruit Tea',
      'Fruit Soda',
      'Yogurt Smoothies',
      'Fresh Lemonade',
      'Frappe',
      'Milktea'
    ]
  },
  Meals: {
    displayName: 'Meals',
    sortOrder: 0,
    subCategories: [
      'Breakfast All Day',
      'Wings & Sides',
      'Rice Meals',
      'Flavored Wings',
      'Combos'
    ]
  }
};

async function fixCategoriesAndSubcategories() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to database');

    // Get all categories
    const allCategories = await Category.find({});
    console.log(`\nFound ${allCategories.length} categories in database`);

    // Delete invalid categories (like "3")
    for (const cat of allCategories) {
      if (!MENU_CONFIG[cat.name] || !cat.name || cat.name.length < 2) {
        console.log(`\n🗑️  Deleting invalid category: ${cat.name} (${cat._id})`);
        await Category.findByIdAndDelete(cat._id);
      }
    }

    // Update or create each category from config
    for (const [categoryName, config] of Object.entries(MENU_CONFIG)) {
      console.log(`\n📝 Processing category: ${categoryName}`);

      // Find existing category or create new one
      let category = await Category.findOne({ name: categoryName });

      if (!category) {
        console.log(`   Creating new category: ${categoryName}`);
        category = new Category({
          name: categoryName,
          displayName: config.displayName,
          sortOrder: config.sortOrder,
          isActive: true,
          colorTheme: '#f1670f'
        });
      } else {
        console.log(`   Updating existing category: ${categoryName}`);
        category.displayName = config.displayName;
        category.sortOrder = config.sortOrder;
        category.isActive = true;
      }

      // Create subcategories
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

      console.log(`   Adding ${subCategories.length} subcategories:`);
      subCategories.forEach(sub => console.log(`      - ${sub.name}`));

      category.subCategories = subCategories;
      await category.save();

      console.log(`   ✓ Successfully updated ${categoryName}`);
    }

    console.log('\n\n✓ All categories and subcategories updated successfully!\n');

    // Verify the update
    console.log('========== VERIFICATION ==========\n');
    const updatedCategories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    
    for (const cat of updatedCategories) {
      console.log(`${cat.name} (ID: ${cat._id})`);
      console.log(`  Display Name: ${cat.displayName}`);
      console.log(`  Sort Order: ${cat.sortOrder}`);
      console.log(`  Active: ${cat.isActive}`);
      console.log(`  Subcategories (${cat.subCategories.length}):`);
      
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach(sub => {
          console.log(`    - ${sub.name} (ID: ${sub._id})`);
          console.log(`        Display Name: ${sub.displayName}`);
          console.log(`        Active: ${sub.isActive}`);
          console.log(`        Sort Order: ${sub.sortOrder}`);
        });
      }
      console.log('');
    }

    console.log('========== DELETION TEST API PATH ==========');
    const testCategory = updatedCategories[0];
    if (testCategory && testCategory.subCategories.length > 0) {
      const testSub = testCategory.subCategories[0];
      console.log(`\nTo test deletion, use this URL in the frontend:`);
      console.log(`DELETE http://localhost:5000/api/categories/${testCategory._id}/subcategories/${testSub._id}`);
      console.log(`\nCategory: ${testCategory.name}`);
      console.log(`Subcategory: ${testSub.name}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

fixCategoriesAndSubcategories();
