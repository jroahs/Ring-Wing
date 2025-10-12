const mongoose = require('mongoose');
const Category = require('./models/Category');
const { logger } = require('./config/logger');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/RingAndWing', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const updateCategorySizes = async () => {
  try {
    console.log('Updating category sizes...');

    // Define the sizing configuration
    const sizingConfig = {
      'Beverages': {
        'Coffee': ['Hot (S)', 'Hot (M)', 'Cold (M)', 'Cold (L)', 'Float (M)', 'Float (L)'],
        'Non-Coffee (Milk-Based)': ['Hot (S)', 'Hot (M)', 'Cold (M)', 'Cold (L)', 'Float (M)', 'Float (L)'],
        'Fruit Tea': ['Medium', 'Large'],
        'Fruit Soda': ['Medium', 'Large'],
        'Milktea': ['Medium', 'Large'],
        'Yogurt Smoothies': ['Medium'],
        'Fresh Lemonade': ['Medium', 'Large'],
        'Frappe': ['Medium', 'Large']
      },
      'Meals': {
        'Breakfast All Day': [], // No sizes for meals
        'Wings & Sides': [],
        'Flavored Wings': [],
        'Combos': [],
        'Snacks': []
      }
    };

    // Update each category
    for (const [categoryName, subCategories] of Object.entries(sizingConfig)) {
      const category = await Category.findOne({ name: categoryName });
      
      if (category) {
        console.log(`Updating ${categoryName} category...`);
        
        // Update subcategories with sizes
        for (const [subCatName, sizes] of Object.entries(subCategories)) {
          const subCategoryIndex = category.subCategories.findIndex(
            sub => sub.name === subCatName
          );
          
          if (subCategoryIndex !== -1) {
            // Convert sizes to proper format
            const sizeObjects = sizes.map((size, index) => ({
              name: size.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              displayName: size,
              isDefault: index === 0,
              sortOrder: index
            }));
            
            category.subCategories[subCategoryIndex].sizes = sizeObjects;
            console.log(`  Updated ${subCatName} with ${sizes.length} sizes: ${sizes.join(', ')}`);
          } else {
            console.log(`  Subcategory ${subCatName} not found in ${categoryName}`);
          }
        }
        
        await category.save();
        console.log(`${categoryName} updated successfully`);
      } else {
        console.log(`Category ${categoryName} not found`);
      }
    }

    console.log('Category sizes update complete!');
    
  } catch (error) {
    console.error('Error updating category sizes:', error);
  }
};

const main = async () => {
  await connectDB();
  await updateCategorySizes();
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updateCategorySizes };
