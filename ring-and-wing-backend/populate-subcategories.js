const mongoose = require('mongoose');

// Connect to admin_db  
const conn = mongoose.createConnection('mongodb://admin:admin@localhost:27017/admin_db?authSource=admin');

// Category schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  subCategories: [{
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  }]
});

// MenuItem schema (to get subcategories from existing menu items)
const menuItemSchema = new mongoose.Schema({
  code: String,
  name: String,
  category: String,
  subCategory: String
}, { collection: 'menuitems' });

const Category = conn.model('Category', categorySchema);
const MenuItem = conn.model('MenuItem', menuItemSchema);

async function populateSubcategories() {
  try {
    // Get all unique subcategories by category from menu items
    const subcategoryData = await MenuItem.aggregate([
      {
        $match: { category: { $in: ['Meals', 'Beverages'] } }
      },
      {
        $group: {
          _id: { category: '$category', subCategory: '$subCategory' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          subcategories: {
            $push: {
              name: '$_id.subCategory',
              count: '$count'
            }
          }
        }
      }
    ]);
    
    console.log('Found subcategories:', JSON.stringify(subcategoryData, null, 2));
    
    // Update categories with subcategories
    for (const catData of subcategoryData) {
      const categoryName = catData._id;
      const subCategories = catData.subcategories
        .filter(sub => sub.name && sub.name.trim() !== '')
        .map((sub, index) => ({
          name: sub.name,
          displayName: sub.name, // Use the same name as displayName initially
          sortOrder: index,
          isActive: true
        }));
      
      console.log('Updating', categoryName, 'with', subCategories.length, 'subcategories');
      
      await Category.findOneAndUpdate(
        { name: categoryName },
        { 
          $set: { subCategories: subCategories }
        },
        { upsert: false, new: true }
      );
    }
    
    // Verify the update
    const categories = await Category.find({}).sort({ sortOrder: 1 });
    categories.forEach(cat => {
      console.log(cat.name + ':');
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach(sub => {
          console.log('  - ' + sub.name + ' (ID: ' + sub._id + ')');
        });
      } else {
        console.log('  (no subcategories)');
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.close();
  }
}

populateSubcategories();