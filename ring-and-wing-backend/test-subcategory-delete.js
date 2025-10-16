const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');

async function testSubcategoryDelete() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Get all categories
    const categories = await Category.find({});
    console.log('\nAvailable categories:');
    categories.forEach(cat => {
      console.log(`\nCategory: ${cat.name} (${cat._id})`);
      console.log('Subcategories:');
      cat.subCategories.forEach(sub => {
        console.log(`  - ${sub.name} (${sub._id}) - Active: ${sub.isActive}`);
      });
    });

    // Test the removeSubCategory method
    const testCategoryId = '68c458d5421216368689708f';
    const testSubCategoryId = '68c459c18049ebe4e962d73d';

    console.log('\n\nTesting deletion...');
    console.log(`Category ID: ${testCategoryId}`);
    console.log(`SubCategory ID: ${testSubCategoryId}`);

    const category = await Category.findById(testCategoryId);
    
    if (!category) {
      console.log('ERROR: Category not found!');
    } else {
      console.log(`Found category: ${category.name}`);
      
      const subCategory = category.subCategories.id(testSubCategoryId);
      
      if (!subCategory) {
        console.log('ERROR: Subcategory not found!');
        console.log('Available subcategory IDs:');
        category.subCategories.forEach(sub => {
          console.log(`  - ${sub._id.toString()}`);
        });
      } else {
        console.log(`Found subcategory: ${subCategory.name}`);
        console.log(`Current isActive status: ${subCategory.isActive}`);
        
        // Try the deletion
        try {
          await category.removeSubCategory(testSubCategoryId);
          console.log('SUCCESS: Subcategory marked as inactive');
          
          // Verify
          const updatedCategory = await Category.findById(testCategoryId);
          const updatedSub = updatedCategory.subCategories.id(testSubCategoryId);
          console.log(`New isActive status: ${updatedSub.isActive}`);
        } catch (deleteError) {
          console.log('ERROR during deletion:', deleteError.message);
          console.log('Full error:', deleteError);
        }
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

testSubcategoryDelete();
