const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
require('dotenv').config();

const menuData = {
  // BEVERAGES - FRAPPE (M / L)
  frappe: [
    { code: 'FRP01', name: 'Leche con Caramelo', pricing: { M: 120, L: 150 } },
    { code: 'FRP02', name: 'Choco Java', pricing: { M: 130, L: 160 } },
    { code: 'FRP03', name: 'ChocoMelt', pricing: { M: 105, L: 130 } },
    { code: 'FRP04', name: 'Dark Mocha', pricing: { M: 110, L: 140 } },
    { code: 'FRP05', name: 'White Mocha', pricing: { M: 110, L: 140 } },
    { code: 'FRP06', name: 'Matcha', pricing: { M: 120, L: 145 } },
    { code: 'FRP07', name: 'Strawberry Matcha', pricing: { M: 125, L: 155 } },
    { code: 'FRP08', name: 'Biscoff Bliss', pricing: { M: 160, L: 195 } },
    { code: 'FRP09', name: 'Mango Crema', pricing: { M: 105, L: 135 } },
    { code: 'FRP10', name: 'Strawberry Cream', pricing: { M: 130, L: 155 } },
    { code: 'FRP11', name: 'Choco Oreo', pricing: { M: 130, L: 155 } },
    { code: 'FRP12', name: 'Oreo & Cream', pricing: { M: 120, L: 145 } },
  ],
  
  // BEVERAGES - FRESH LEMONADE (M / L + singles)
  freshLemonade: [
    { code: 'LEM01', name: 'Classic', pricing: { M: 60, L: 85 } },
    { code: 'LEM02', name: 'Strawberry', pricing: { M: 65, L: 90 } },
    { code: 'LEM03', name: 'Blueberry', pricing: { M: 65, L: 90 } },
    { code: 'LEM04', name: 'Lychee', pricing: { M: 65, L: 90 } },
    { code: 'LEM05', name: 'Cucumber', pricing: { M: 65, L: 90 } },
    { code: 'LEM06', name: 'Lemon Yakult', pricing: { single: 110 }, ignoreSizes: true },
    { code: 'LEM07', name: 'Orange Lemon', pricing: { single: 120 }, ignoreSizes: true },
  ],
  
  // BEVERAGES - FRUITMILK / MILKTEA (Regular only)
  fruitmilkMilktea: [
    { code: 'FTM01', name: 'Strawberry Fruit Milk', pricing: { Regular: 80 } },
    { code: 'FTM02', name: 'Blueberry Fruit Milk', pricing: { Regular: 80 } },
    { code: 'FTM03', name: 'Mango Fruit Milk', pricing: { Regular: 80 } },
    { code: 'FTM04', name: 'Classic Milktea', pricing: { Regular: 80 } },
    { code: 'FTM05', name: 'Strawberry Milktea', pricing: { Regular: 80 } },
    { code: 'FTM06', name: 'Blueberry Milktea', pricing: { Regular: 80 } },
    { code: 'FTM07', name: 'Matcha Milktea', pricing: { Regular: 85 } },
  ],
  
  // BEVERAGES - FRUIT TEA / FRUIT SODA / ICED TEA (mixed)
  fruitTeaSodaIcedTea: [
    { code: 'FTS01', name: 'Fruit Tea', pricing: { M: 55, L: 80 } },
    { code: 'FTS02', name: 'Fruit Soda', pricing: { single: 65 }, ignoreSizes: true },
    { code: 'FTS03', name: 'Iced Tea', pricing: { single: 35 }, ignoreSizes: true },
  ],
  
  // BEVERAGES - HOT BEVERAGES (Regular only)
  hotBeverages: [
    { code: 'HOT01', name: 'Cafe Americano', pricing: { Regular: 80 } },
    { code: 'HOT02', name: 'Classic Cafe Latte', pricing: { Regular: 100 } },
    { code: 'HOT03', name: 'Spanish Cafe Latte', pricing: { Regular: 110 } },
    { code: 'HOT04', name: 'Cappuccino', pricing: { Regular: 100 } },
    { code: 'HOT05', name: 'Dark Mocha', pricing: { Regular: 135 } },
    { code: 'HOT06', name: 'White Mocha', pricing: { Regular: 135 } },
    { code: 'HOT07', name: 'Dirty Matcha', pricing: { Regular: 135 } },
    { code: 'HOT08', name: 'Caramel Macchiato', pricing: { Regular: 135 } },
    { code: 'HOT09', name: 'Choco Latte', pricing: { Regular: 120 } },
    { code: 'HOT10', name: 'Matcha Latte', pricing: { Regular: 120 } },
    { code: 'HOT11', name: 'White Chocolate Latte', pricing: { Regular: 120 } },
    { code: 'HOT12', name: 'Hot Tea (Flavored)', pricing: { Regular: 45 } },
  ],
  
  // BEVERAGES - ICED ESPRESSO (M / L)
  icedEspresso: [
    { code: 'ICE01', name: 'Cafe Americano', pricing: { M: 65, L: 80 } },
    { code: 'ICE02', name: 'Classic Cafe Latte', pricing: { M: 85, L: 100 } },
    { code: 'ICE03', name: 'Spanish Cafe Latte', pricing: { M: 90, L: 110 } },
    { code: 'ICE04', name: 'Muscovado Cafe Latte', pricing: { M: 95, L: 120 } },
    { code: 'ICE05', name: 'Dark Mocha', pricing: { M: 120, L: 155 } },
    { code: 'ICE06', name: 'Dirty Matcha', pricing: { M: 130, L: 160 } },
    { code: 'ICE07', name: 'Caramel Macchiato', pricing: { M: 120, L: 140 } },
    { code: 'ICE08', name: 'White Mocha', pricing: { M: 120, L: 145 } },
    { code: 'ICE09', name: 'Choco Latte', pricing: { M: 105, L: 135 } },
    { code: 'ICE10', name: 'Matcha Latte', pricing: { M: 110, L: 140 } },
    { code: 'ICE11', name: 'White Chocolate Latte', pricing: { M: 100, L: 130 } },
  ],
  
  // MEALS - RICE MEALS (single prices)
  riceMeals: [
    { code: 'RIC01', name: 'Classic Boneless Bangus', pricing: { single: 160 }, ignoreSizes: true },
    { code: 'RIC02', name: 'Hickory Pork Belly', pricing: { single: 195 }, ignoreSizes: true },
    { code: 'RIC03', name: 'Breaded Liempo', pricing: { single: 195 }, ignoreSizes: true },
    { code: 'RIC04', name: 'Breaded Porkchop', pricing: { single: 129 }, ignoreSizes: true },
    { code: 'RIC05', name: '4 Flavored Wings Meal', pricing: { single: 195 }, ignoreSizes: true },
    { code: 'RIC06', name: 'Flavor Bites', pricing: { single: 99 }, ignoreSizes: true },
    { code: 'RIC07', name: 'Crispy Teri-Chix', pricing: { single: 119 }, ignoreSizes: true },
    { code: 'RIC08', name: 'Big Solo Meal', pricing: { single: 280 }, ignoreSizes: true },
    { code: 'RIC09', name: 'UniWings (Unlimited)', pricing: { single: 380 }, ignoreSizes: true },
  ],
  
  // MEALS - APPETIZERS / SANDWICHES (single prices)
  appetizersSandwiches: [
    { code: 'APP01', name: 'Chicken Bites Ala Carte', pricing: { single: 99 }, ignoreSizes: true },
    { code: 'APP02', name: 'Churros Sticks', pricing: { single: 120 }, ignoreSizes: true },
    { code: 'APP03', name: 'French Fries', pricing: { single: 60 }, ignoreSizes: true },
    { code: 'APP04', name: 'Kropek', pricing: { single: 99 }, ignoreSizes: true },
    { code: 'APP05', name: 'Tuna Melt Sandwich', pricing: { single: 105 }, ignoreSizes: true },
    { code: 'APP06', name: 'Crispy Chicken Burger', pricing: { single: 99 }, ignoreSizes: true },
    { code: 'APP07', name: 'Wings & Fries (6 pcs)', pricing: { single: 215 }, ignoreSizes: true },
  ],
  
  // MEALS - FLAVORED WINGS (single prices)
  flavoredWings: [
    { code: 'WNG01', name: 'Soloista (8 pcs)', pricing: { single: 199 }, ignoreSizes: true },
    { code: 'WNG02', name: 'Mini Squad Set (25 pcs)', pricing: { single: 550 }, ignoreSizes: true },
    { code: 'WNG03', name: 'Bilao Bundle (40 pcs)', pricing: { single: 930 }, ignoreSizes: true },
  ],
};

const seedCompleteMenu = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing menu items
    const deleteResult = await MenuItem.deleteMany({});
    console.log(`\nCleared ${deleteResult.deletedCount} existing menu items`);
    
    let totalInserted = 0;
    const results = {};
    
    // Seed Beverages - Frappe
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING BEVERAGES - FRAPPE');
    console.log('='.repeat(60));
    for (const item of menuData.frappe) {
      const menuItem = new MenuItem({
        ...item,
        category: 'Beverages',
        subCategory: 'Frappe',
        isAvailable: true
      });
      await menuItem.save();
      console.log(`✓ ${item.code}: ${item.name} - M: ₱${item.pricing.M}, L: ₱${item.pricing.L}`);
      totalInserted++;
    }
    results.frappe = menuData.frappe.length;
    
    // Seed Beverages - Fresh Lemonade
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING BEVERAGES - FRESH LEMONADE');
    console.log('='.repeat(60));
    for (const item of menuData.freshLemonade) {
      const menuItem = new MenuItem({
        ...item,
        category: 'Beverages',
        subCategory: 'Fresh Lemonade',
        isAvailable: true
      });
      await menuItem.save();
      if (item.ignoreSizes) {
        console.log(`✓ ${item.code}: ${item.name} - ₱${item.pricing.single} (single price)`);
      } else {
        console.log(`✓ ${item.code}: ${item.name} - M: ₱${item.pricing.M}, L: ₱${item.pricing.L}`);
      }
      totalInserted++;
    }
    results.freshLemonade = menuData.freshLemonade.length;
    
    // Seed Beverages - Fruitmilk / Milktea
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING BEVERAGES - FRUITMILK / MILKTEA');
    console.log('='.repeat(60));
    for (const item of menuData.fruitmilkMilktea) {
      const menuItem = new MenuItem({
        ...item,
        category: 'Beverages',
        subCategory: 'Fruitmilk / Milktea',
        isAvailable: true
      });
      await menuItem.save();
      console.log(`✓ ${item.code}: ${item.name} - ₱${item.pricing.Regular}`);
      totalInserted++;
    }
    results.fruitmilkMilktea = menuData.fruitmilkMilktea.length;
    
    // Seed Beverages - Fruit Tea / Fruit Soda / Iced Tea
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING BEVERAGES - FRUIT TEA / FRUIT SODA / ICED TEA');
    console.log('='.repeat(60));
    for (const item of menuData.fruitTeaSodaIcedTea) {
      const menuItem = new MenuItem({
        ...item,
        category: 'Beverages',
        subCategory: 'Fruit Tea / Fruit Soda / Iced Tea',
        isAvailable: true
      });
      await menuItem.save();
      if (item.ignoreSizes) {
        console.log(`✓ ${item.code}: ${item.name} - ₱${item.pricing.single} (single price)`);
      } else {
        console.log(`✓ ${item.code}: ${item.name} - M: ₱${item.pricing.M}, L: ₱${item.pricing.L}`);
      }
      totalInserted++;
    }
    results.fruitTeaSodaIcedTea = menuData.fruitTeaSodaIcedTea.length;
    
    // Seed Beverages - Hot Beverages
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING BEVERAGES - HOT BEVERAGES');
    console.log('='.repeat(60));
    for (const item of menuData.hotBeverages) {
      const menuItem = new MenuItem({
        ...item,
        category: 'Beverages',
        subCategory: 'Hot Beverages',
        isAvailable: true
      });
      await menuItem.save();
      console.log(`✓ ${item.code}: ${item.name} - ₱${item.pricing.Regular}`);
      totalInserted++;
    }
    results.hotBeverages = menuData.hotBeverages.length;
    
    // Seed Beverages - Iced Espresso
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING BEVERAGES - ICED ESPRESSO');
    console.log('='.repeat(60));
    for (const item of menuData.icedEspresso) {
      const menuItem = new MenuItem({
        ...item,
        category: 'Beverages',
        subCategory: 'Iced Espresso',
        isAvailable: true
      });
      await menuItem.save();
      console.log(`✓ ${item.code}: ${item.name} - M: ₱${item.pricing.M}, L: ₱${item.pricing.L}`);
      totalInserted++;
    }
    results.icedEspresso = menuData.icedEspresso.length;
    
    // Seed Meals - Rice Meals
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING MEALS - RICE MEALS');
    console.log('='.repeat(60));
    for (const item of menuData.riceMeals) {
      const menuItem = new MenuItem({
        ...item,
        category: 'Meals',
        subCategory: 'Rice Meals',
        isAvailable: true
      });
      await menuItem.save();
      console.log(`✓ ${item.code}: ${item.name} - ₱${item.pricing.single}`);
      totalInserted++;
    }
    results.riceMeals = menuData.riceMeals.length;
    
    // Seed Meals - Appetizers / Sandwiches
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING MEALS - APPETIZERS / SANDWICHES');
    console.log('='.repeat(60));
    for (const item of menuData.appetizersSandwiches) {
      const menuItem = new MenuItem({
        ...item,
        category: 'Meals',
        subCategory: 'Appetizers / Sandwiches',
        isAvailable: true
      });
      await menuItem.save();
      console.log(`✓ ${item.code}: ${item.name} - ₱${item.pricing.single}`);
      totalInserted++;
    }
    results.appetizersSandwiches = menuData.appetizersSandwiches.length;
    
    // Seed Meals - Flavored Wings
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING MEALS - FLAVORED WINGS');
    console.log('='.repeat(60));
    for (const item of menuData.flavoredWings) {
      const menuItem = new MenuItem({
        ...item,
        category: 'Meals',
        subCategory: 'Flavored Wings',
        isAvailable: true
      });
      await menuItem.save();
      console.log(`✓ ${item.code}: ${item.name} - ₱${item.pricing.single}`);
      totalInserted++;
    }
    results.flavoredWings = menuData.flavoredWings.length;
    
    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING COMPLETE - SUMMARY');
    console.log('='.repeat(60));
    console.log('\nBEVERAGES:');
    console.log(`  Frappe: ${results.frappe} items`);
    console.log(`  Fresh Lemonade: ${results.freshLemonade} items`);
    console.log(`  Fruitmilk / Milktea: ${results.fruitmilkMilktea} items`);
    console.log(`  Fruit Tea / Fruit Soda / Iced Tea: ${results.fruitTeaSodaIcedTea} items`);
    console.log(`  Hot Beverages: ${results.hotBeverages} items`);
    console.log(`  Iced Espresso: ${results.icedEspresso} items`);
    console.log('\nMEALS:');
    console.log(`  Rice Meals: ${results.riceMeals} items`);
    console.log(`  Appetizers / Sandwiches: ${results.appetizersSandwiches} items`);
    console.log(`  Flavored Wings: ${results.flavoredWings} items`);
    console.log('\n' + '='.repeat(60));
    console.log(`TOTAL: ${totalInserted} menu items created successfully!`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error seeding menu:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

seedCompleteMenu();
