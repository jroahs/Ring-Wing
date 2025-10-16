const mongoose = require('mongoose');
require('dotenv').config();

const cleanupDuplicateSubcategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const categoriesCollection = db.collection('categories');
    
    console.log('='.repeat(60));
    console.log('REMOVING OLD subcategories FIELD (lowercase)');
    console.log('='.repeat(60));
    
    // Remove the old "subcategories" field (lowercase) from all documents
    const result = await categoriesCollection.updateMany(
      {},
      { $unset: { subcategories: "" } }
    );
    
    console.log(`\n✓ Updated ${result.modifiedCount} documents`);
    console.log('✓ Removed old "subcategories" field');
    console.log('✓ Keeping new "subCategories" field with sizes\n');
    
    // Verify the result
    const categories = await categoriesCollection.find({}).toArray();
    
    console.log('='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));
    
    categories.forEach(cat => {
      console.log(`\n${cat.name}:`);
      console.log(`  Has "subcategories" (old): ${!!cat.subcategories}`);
      console.log(`  Has "subCategories" (new): ${!!cat.subCategories}`);
      if (cat.subCategories) {
        console.log(`  SubCategories count: ${cat.subCategories.length}`);
        cat.subCategories.forEach(sub => {
          const sizesInfo = sub.sizes && sub.sizes.length > 0 
            ? ` [${sub.sizes.map(s => s.name).join(', ')}]`
            : '';
          console.log(`    - ${sub.displayName || sub.name}${sizesInfo}`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('CLEANUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nThe POS will now show only the new subcategories.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

cleanupDuplicateSubcategories();
