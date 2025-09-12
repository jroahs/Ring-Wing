const mongoose = require('mongoose');
const Category = require('./models/Category');
const express = require('express');

// Test the API order directly
const testApiOrder = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ring-and-wing');
    
    console.log('=== Direct Database Query ===');
    const dbCategories = await Category.find().sort({ sortOrder: 1, name: 1 });
    dbCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (sortOrder: ${cat.sortOrder || 0})`);
    });
    
    console.log('\n=== Using getCategoriesWithConfig Method ===');
    const configCategories = await Category.getCategoriesWithConfig();
    configCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (sortOrder: ${cat.sortOrder || 0})`);
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
};

testApiOrder();