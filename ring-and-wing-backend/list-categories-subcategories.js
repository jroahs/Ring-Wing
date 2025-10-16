const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');

async function listAllCategoriesAndSubcategories() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Get all categories with full details
    const categories = await Category.find({}).lean();
    
    console.log('\n=== ALL CATEGORIES AND SUBCATEGORIES ===\n');
    
    categories.forEach(cat => {
      console.log(`Category: ${cat.name}`);
      console.log(`  ID: ${cat._id}`);
      console.log(`  Display Name: ${cat.displayName}`);
      console.log(`  Active: ${cat.isActive}`);
      console.log(`  Sort Order: ${cat.sortOrder}`);
      console.log(`  Subcategories Count: ${cat.subCategories ? cat.subCategories.length : 0}`);
      
      if (cat.subCategories && cat.subCategories.length > 0) {
        console.log(`  Subcategories:`);
        cat.subCategories.forEach((sub, index) => {
          console.log(`    ${index + 1}. ${sub.name}`);
          console.log(`       ID: ${sub._id}`);
          console.log(`       Display Name: ${sub.displayName}`);
          console.log(`       Active: ${sub.isActive}`);
          console.log(`       Sort Order: ${sub.sortOrder}`);
          console.log(`       Has Sizes: ${sub.sizes ? sub.sizes.length : 0}`);
          if (sub.description) {
            console.log(`       Description: ${sub.description}`);
          }
        });
      } else {
        console.log(`  No subcategories`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

listAllCategoriesAndSubcategories();
