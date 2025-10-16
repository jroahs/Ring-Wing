const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config();

const seedBeverageSizes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Size configurations for each subcategory
    const sizeConfigs = {
      'Frappe': [
        { name: 'M', displayName: 'Medium', sortOrder: 0, isDefault: true },
        { name: 'L', displayName: 'Large', sortOrder: 1, isDefault: false }
      ],
      'Fresh Lemonade': [
        { name: 'M', displayName: 'Medium', sortOrder: 0, isDefault: true },
        { name: 'L', displayName: 'Large', sortOrder: 1, isDefault: false }
      ],
      'Fruitmilk / Milktea': [
        { name: 'Regular', displayName: 'Regular', sortOrder: 0, isDefault: true }
      ],
      'Fruit Tea / Fruit Soda / Iced Tea': [
        { name: 'M', displayName: 'Medium', sortOrder: 0, isDefault: true },
        { name: 'L', displayName: 'Large', sortOrder: 1, isDefault: false }
      ],
      'Hot Beverages': [
        { name: 'Regular', displayName: 'Regular', sortOrder: 0, isDefault: true }
      ],
      'Iced Espresso': [
        { name: 'M', displayName: 'Medium', sortOrder: 0, isDefault: true },
        { name: 'L', displayName: 'Large', sortOrder: 1, isDefault: false }
      ]
    };

    // Find the Beverages category
    const beveragesCategory = await Category.findOne({ 
      name: { $regex: /^beverages$/i }
    });

    if (!beveragesCategory) {
      console.log('Beverages category not found!');
      process.exit(1);
    }

    console.log('\nFound Beverages category:', beveragesCategory.name);
    console.log('Current subcategories:', beveragesCategory.subCategories.length);

    // Update each subcategory with its size configuration
    let updatedCount = 0;
    for (const subcategory of beveragesCategory.subCategories) {
      const displayName = subcategory.displayName;
      const sizes = sizeConfigs[displayName];

      if (sizes) {
        subcategory.sizes = sizes;
        updatedCount++;
        console.log(`\n✓ Updated "${displayName}" with sizes:`, 
          sizes.map(s => `${s.name} (${s.displayName})`).join(', ')
        );
      } else {
        console.log(`\n⚠ No size config found for "${displayName}"`);
      }
    }

    // Save the updated category
    await beveragesCategory.save();
    
    console.log('\n' + '='.repeat(60));
    console.log(`SUCCESS: Updated ${updatedCount} subcategories with sizes`);
    console.log('='.repeat(60));

    // Verify the results
    console.log('\nFinal subcategory sizes:');
    beveragesCategory.subCategories.forEach(sub => {
      console.log(`\n${sub.displayName}:`);
      if (sub.sizes && sub.sizes.length > 0) {
        sub.sizes.forEach(size => {
          console.log(`  - ${size.name}: ${size.displayName} (default: ${size.isDefault})`);
        });
      } else {
        console.log('  No sizes defined');
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

seedBeverageSizes();
