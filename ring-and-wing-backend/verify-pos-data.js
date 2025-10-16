const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config();

const verifyPOSData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');
    
    const categories = await Category.find({}).sort({ sortOrder: 1 });
    
    console.log('='.repeat(70));
    console.log('POS CATEGORY & SUBCATEGORY VERIFICATION');
    console.log('='.repeat(70));
    
    categories.forEach((category, idx) => {
      console.log(`\n${idx + 1}. ${category.displayName || category.name} (${category.name})`);
      console.log(`   Sort Order: ${category.sortOrder}`);
      
      const subcats = category.subCategories || [];
      const activeSubcats = subcats.filter(sub => sub.isActive !== false);
      const inactiveSubcats = subcats.filter(sub => sub.isActive === false);
      
      console.log(`   Total Subcategories: ${subcats.length}`);
      console.log(`   Active: ${activeSubcats.length}, Inactive: ${inactiveSubcats.length}`);
      
      if (activeSubcats.length > 0) {
        console.log('\n   Active Subcategories:');
        activeSubcats.forEach((sub, subIdx) => {
          const sizesInfo = sub.sizes && sub.sizes.length > 0 
            ? ` [Sizes: ${sub.sizes.map(s => s.name).join(', ')}]`
            : ' [No sizes]';
          console.log(`     ${subIdx + 1}. ${sub.displayName || sub.name}${sizesInfo}`);
        });
      }
      
      if (inactiveSubcats.length > 0) {
        console.log('\n   ⚠ Inactive Subcategories (should NOT appear in POS):');
        inactiveSubcats.forEach((sub, subIdx) => {
          console.log(`     ${subIdx + 1}. ${sub.displayName || sub.name} (DELETED)`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(70));
    console.log('\nWhat POS will show:');
    console.log('- Categories: Sorted by sortOrder');
    console.log('- Subcategories: Only active ones (isActive !== false)');
    console.log('- Sizes: Included in menuConfig for dynamic pricing');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

verifyPOSData();
