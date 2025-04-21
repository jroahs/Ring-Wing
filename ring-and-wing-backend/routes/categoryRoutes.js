const express = require('express');
const router = express.Router();
const Menu = require('../models/MenuItem'); // Ensure this path is correct

// GET /api/categories - Fetch categories and their sub-categories from the menu collection
router.get('/', async (req, res) => {
  try {
    const categories = await Menu.aggregate([
      {
        $group: {
          _id: '$category',
          subCategories: { $addToSet: '$subCategory' } // Collect unique subCategories
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          subCategories: 1
        }
      }
    ]);

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
