const mongoose = require('mongoose');

// Connect to admin_db  
const conn = mongoose.createConnection('mongodb://admin:admin@localhost:27017/admin_db?authSource=admin');

// Category schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  subcategories: [{
    name: { type: String, required: true },
    sortOrder: { type: Number, default: 0 }
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
      const subcategories = catData.subcategories
        .filter(sub => sub.name && sub.name.trim() !== '')
        .map((sub, index) => ({
          name: sub.name,
          sortOrder: index
        }));
      
      console.log('Updating', categoryName, 'with', subcategories.length, 'subcategories');
      
      await Category.findOneAndUpdate(
        { name: categoryName },
        { 
          $set: { subcategories: subcategories }
        },
        { upsert: false, new: true }
      );
    }
    
    // Verify the update
    const categories = await Category.find({}).sort({ sortOrder: 1 });
    categories.forEach(cat => {
      console.log(cat.name + ':');
      cat.subcategories.forEach(sub => {
        console.log('  - ' + sub.name);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.close();
  }
}

populateSubcategories();