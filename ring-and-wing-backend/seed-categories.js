const mongoose = require('mongoose');
const Category = require('./models/Category');
const AddOn = require('./models/AddOn');
const { logger } = require('./config/logger');

// Import the current MENU_CONFIG structure from frontend
const MENU_CONFIG = {
  Beverages: {
    subCategories: {
      'Coffee': {
        sizes: ['Hot (S)', 'Hot (M)', 'Cold (M)', 'Cold (L)', 'Float (M)', 'Float (L)']
      },
      'Non-Coffee (Milk-Based)': {
        sizes: ['Hot (S)', 'Hot (M)', 'Cold (M)', 'Cold (L)', 'Float (M)', 'Float (L)']
      },
      'Fruit Tea': {
        sizes: ['Medium', 'Large']
      },
      'Fruit Soda': {
        sizes: ['Medium', 'Large']
      },
      'Milktea': {
        sizes: ['Medium', 'Large'],
        addons: ['Tapioca Pearls', 'Nata', 'Nutella', 'Cream Puff']
      },
      'Yogurt Smoothies': {
        sizes: ['Medium']
      },
      'Fresh Lemonade': {
        sizes: ['Medium', 'Large']
      },
      'Frappe': {
        sizes: ['Medium', 'Large']
      }
    }
  },
  Meals: {
    subCategories: {
      'Breakfast All Day': { sizes: [] },
      'Wings & Sides': { sizes: [] },
      'Flavored Wings': { sizes: [] },
      'Combos': { sizes: [] },
      'Snacks': { sizes: [] }
    }
  }
};

const ADDONS_CONFIG = {
  'Milktea': ['Tapioca Pearls', 'Nata', 'Nutella', 'Cream Puff'],
  'Frappe': ['Whipped Cream', 'Caramel Drizzle'],
  'Yogurt Smoothies': ['Granola', 'Fresh Fruits']
};

async function findOrCreateAddOns(addonNames) {
  const addOnIds = [];
  
  for (const addonName of addonNames) {
    try {
      let addOn = await AddOn.findOne({ name: addonName });
      
      if (!addOn) {
        // Create addon if it doesn't exist
        addOn = new AddOn({
          name: addonName,
          price: 15, // Default price, can be updated later
          category: 'Beverages',
          isActive: true
        });
        await addOn.save();
        logger.info(`Created addon: ${addonName}`);
      }
      
      addOnIds.push(addOn._id);
    } catch (error) {
      logger.warn(`Could not process addon ${addonName}:`, error.message);
    }
  }
  
  return addOnIds;
}

function createSizeObjects(sizeNames) {
  return sizeNames.map((sizeName, index) => ({
    name: sizeName,
    displayName: sizeName,
    isDefault: index === 0, // First size is default
    sortOrder: index
  }));
}

async function seedCategories() {
  try {
    logger.info('Starting category seeding process...');
    
    // Check if categories already exist
    const existingCount = await Category.countDocuments();
    if (existingCount > 0) {
      logger.info(`Found ${existingCount} existing categories. Skipping seeding.`);
      return;
    }

    const categoriesToCreate = [];

    // Process each main category
    for (const [categoryName, categoryConfig] of Object.entries(MENU_CONFIG)) {
      logger.info(`Processing category: ${categoryName}`);
      
      const subCategoriesToCreate = [];

      // Process subcategories
      for (const [subCategoryName, subCategoryConfig] of Object.entries(categoryConfig.subCategories)) {
        logger.info(`Processing subcategory: ${subCategoryName}`);
        
        // Handle sizes
        const sizes = subCategoryConfig.sizes ? 
          createSizeObjects(subCategoryConfig.sizes) : [];

        // Handle addons
        let availableAddons = [];
        const addonList = subCategoryConfig.addons || ADDONS_CONFIG[subCategoryName] || [];
        if (addonList.length > 0) {
          availableAddons = await findOrCreateAddOns(addonList);
        }

        // Determine business rules
        const rules = {
          requiresSize: sizes.length > 0,
          allowMultipleSizes: false,
          defaultPreparationTime: categoryName === 'Beverages' ? 10 : 15,
          hasAddons: availableAddons.length > 0
        };

        const subCategory = {
          name: subCategoryName,
          displayName: subCategoryName,
          description: `${subCategoryName} items`,
          sortOrder: Object.keys(categoryConfig.subCategories).indexOf(subCategoryName),
          isActive: true,
          sizes: sizes,
          availableAddons: availableAddons,
          rules: rules
        };

        subCategoriesToCreate.push(subCategory);
      }

      // Create main category
      const category = {
        name: categoryName,
        displayName: categoryName,
        description: `${categoryName} menu items`,
        sortOrder: Object.keys(MENU_CONFIG).indexOf(categoryName),
        isActive: true,
        icon: categoryName === 'Beverages' ? 'beverage-icon' : 'meal-icon',
        colorTheme: categoryName === 'Beverages' ? '#3B82F6' : '#F59E0B',
        subCategories: subCategoriesToCreate,
        categoryRules: {
          allowDirectItems: true,
          requireSubcategory: false
        }
      };

      categoriesToCreate.push(category);
    }

    // Insert all categories
    const createdCategories = await Category.insertMany(categoriesToCreate);
    
    logger.info(`Successfully seeded ${createdCategories.length} categories:`);
    createdCategories.forEach(cat => {
      logger.info(`- ${cat.name} (${cat.subCategories.length} subcategories)`);
    });

    return createdCategories;
  } catch (error) {
    logger.error('Error seeding categories:', error);
    throw error;
  }
}

async function validateSeeding() {
  try {
    logger.info('Validating seeded data...');
    
    const categories = await Category.find({ isActive: true })
      .populate('subCategories.availableAddons');
    
    logger.info('\n=== SEEDING VALIDATION REPORT ===');
    
    for (const category of categories) {
      logger.info(`\nCategory: ${category.name}`);
      logger.info(`- Subcategories: ${category.subCategories.length}`);
      
      for (const subCategory of category.subCategories) {
        logger.info(`  • ${subCategory.name}:`);
        logger.info(`    - Sizes: ${subCategory.sizes.length}`);
        logger.info(`    - Addons: ${subCategory.availableAddons.length}`);
        logger.info(`    - Requires Size: ${subCategory.rules.requiresSize}`);
      }
    }
    
    logger.info('\n=== VALIDATION COMPLETE ===\n');
    return true;
  } catch (error) {
    logger.error('Validation error:', error);
    return false;
  }
}

// Main execution function
async function runSeeding() {
  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info('Connected to MongoDB for seeding');
    }

    // Run seeding
    await seedCategories();
    
    // Validate seeding
    const validationResult = await validateSeeding();
    
    if (validationResult) {
      logger.info('🎉 Category seeding completed successfully!');
    } else {
      logger.error('❌ Seeding validation failed');
    }

    return validationResult;
  } catch (error) {
    logger.error('Seeding process failed:', error);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = {
  seedCategories,
  validateSeeding,
  runSeeding
};

// Run seeding if this script is executed directly
if (require.main === module) {
  runSeeding()
    .then(() => {
      logger.info('Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding script failed:', error);
      process.exit(1);
    });
}
