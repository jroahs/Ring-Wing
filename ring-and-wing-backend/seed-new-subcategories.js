const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');

// New subcategory configuration
const NEW_SUBCATEGORIES = {
  'Meals': [
    'Rice Meals',
    'Appetizers / Sandwiches',
    'Flavored Wings'
  ],
  'Beverages': [
    'Frappe',
    'Fresh Lemonade',
    'Fruitmilk / Milktea',
    'Fruit Tea / Fruit Soda / Iced Tea',
    'Hot Beverages',
    'Iced Espresso'
  ]
};

async function seedNewSubcategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to database\n');

    for (const [categoryName, subCategoryNames] of Object.entries(NEW_SUBCATEGORIES)) {
      console.log(`\n📝 Processing category: ${categoryName}`);
      
      const category = await Category.findOne({ name: categoryName });
      
      if (!category) {
        console.log(`❌ Category "${categoryName}" not found! Skipping...`);
        continue;
      }

      console.log(`   Found category ID: ${category._id}`);
      console.log(`   Current subcategories: ${category.subCategories.length}`);

      // Clear existing subcategories
      category.subCategories = [];
      console.log('   Cleared existing subcategories');

      // Add new subcategories
      const newSubCategories = subCategoryNames.map((name, index) => ({
        name: name,
        displayName: name,
        sortOrder: index,
        isActive: true,
        description: `${name} from ${categoryName}`,
        sizes: [],
        availableAddons: [],
        rules: {
          requiresSize: name.includes('Milktea') || name.includes('Espresso') || name.includes('Hot Beverages'),
          allowMultipleSizes: false,
          defaultPreparationTime: 15,
          hasAddons: name.includes('Milktea') || categoryName === 'Meals'
        }
      }));

      category.subCategories = newSubCategories;
      await category.save();

      console.log(`   ✓ Added ${newSubCategories.length} new subcategories:`);
      newSubCategories.forEach(sub => console.log(`      - ${sub.name}`));
    }

    console.log('\n\n========== VERIFICATION ==========\n');
    
    const allCategories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    
    for (const cat of allCategories) {
      console.log(`${cat.name} (ID: ${cat._id})`);
      console.log(`  Display Name: ${cat.displayName}`);
      console.log(`  Subcategories (${cat.subCategories.length}):`);
      
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach((sub, idx) => {
          console.log(`    ${idx + 1}. ${sub.name} (ID: ${sub._id})`);
          console.log(`       Active: ${sub.isActive}`);
          console.log(`       Sort Order: ${sub.sortOrder}`);
        });
      } else {
        console.log('    (no subcategories)');
      }
      console.log('');
    }

    console.log('✅ Seeding complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

seedNewSubcategories();
