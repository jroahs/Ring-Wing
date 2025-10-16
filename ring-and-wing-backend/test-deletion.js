const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/Category');

async function testSubcategoryDeletion() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to database');

    // Get categories
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    
    if (categories.length === 0) {
      console.log('❌ No categories found');
      return;
    }

    const testCategory = categories[0];
    console.log(`\nTesting with category: ${testCategory.name} (${testCategory._id})`);
    
    if (!testCategory.subCategories || testCategory.subCategories.length === 0) {
      console.log('❌ No subcategories found in this category');
      return;
    }

    const testSubcategory = testCategory.subCategories[0];
    console.log(`Testing subcategory: ${testSubcategory.name} (${testSubcategory._id})`);
    console.log(`Current isActive status: ${testSubcategory.isActive}`);

    // Test the removeSubCategory method
    console.log('\n--- Testing removeSubCategory method ---');
    try {
      await testCategory.removeSubCategory(testSubcategory._id);
      console.log('✓ Subcategory marked as inactive');

      // Verify the change
      const updatedCategory = await Category.findById(testCategory._id);
      const updatedSubcategory = updatedCategory.subCategories.id(testSubcategory._id);
      
      if (updatedSubcategory) {
        console.log(`New isActive status: ${updatedSubcategory.isActive}`);
        
        if (updatedSubcategory.isActive === false) {
          console.log('✅ DELETION TEST PASSED - Subcategory successfully marked as inactive');
          
          // Restore it for future tests
          updatedSubcategory.isActive = true;
          await updatedCategory.save();
          console.log('✓ Restored subcategory for future tests');
        } else {
          console.log('❌ DELETION TEST FAILED - Subcategory is still active');
        }
      } else {
        console.log('❌ ERROR: Could not find subcategory after update');
      }

    } catch (deleteError) {
      console.log('❌ DELETION TEST FAILED');
      console.error('Error:', deleteError.message);
    }

    // Show all categories and their subcategories
    console.log('\n=== Current Database State ===\n');
    const allCategories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    
    for (const cat of allCategories) {
      console.log(`${cat.name}:`);
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach(sub => {
          const status = sub.isActive ? '✓ Active' : '✗ Inactive';
          console.log(`  - ${sub.name} (${sub._id}) [${status}]`);
        });
      } else {
        console.log('  (no subcategories)');
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

testSubcategoryDeletion();
