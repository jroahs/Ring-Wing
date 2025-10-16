const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');

// Your exact new subcategory structure
const NEW_SUBCATEGORIES = {
  Meals: [
    'Rice Meals',
    'Appetizers / Sandwiches',
    'Flavored Wings'
  ],
  Beverages: [
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
    console.log('✓ Connected to database');

    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    console.log(`\nFound ${categories.length} active categories\n`);

    for (const category of categories) {
      const categoryName = category.name;
      const newSubs = NEW_SUBCATEGORIES[categoryName];

      if (!newSubs) {
        console.log(`⚠ No subcategories defined for ${categoryName}, skipping...`);
        continue;
      }

      console.log(`📝 Updating ${categoryName}:`);
      console.log(`   - Clearing ${category.subCategories.length} old subcategories`);
      console.log(`   - Adding ${newSubs.length} new subcategories:`);
      
      // Create new subcategories
      const subCategories = newSubs.map((name, index) => ({
        name: name,
        displayName: name,
        sortOrder: index,
        isActive: true,
        description: `${name} from ${categoryName}`,
        sizes: [],
        availableAddons: [],
        rules: {
          requiresSize: false,
          allowMultipleSizes: false,
          defaultPreparationTime: 15,
          hasAddons: categoryName === 'Meals'
        }
      }));

      subCategories.forEach(sub => console.log(`      - ${sub.name}`));

      // Replace all subcategories
      category.subCategories = subCategories;
      await category.save();

      console.log(`   ✓ Successfully updated ${categoryName}\n`);
    }

    console.log('✅ All categories updated with new subcategories!\n');

    // Verification
    console.log('========== VERIFICATION ==========\n');
    const updatedCategories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    
    for (const cat of updatedCategories) {
      console.log(`${cat.name} (${cat._id})`);
      console.log(`  Active subcategories: ${cat.subCategories.filter(s => s.isActive).length}`);
      
      cat.subCategories.filter(s => s.isActive).forEach(sub => {
        console.log(`    ✓ ${sub.name} (${sub._id})`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedNewSubcategories();
