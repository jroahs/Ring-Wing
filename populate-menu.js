// Node.js 18+ has built-in fetch
// const fetch = globalThis.fetch;

const API_BASE = 'http://localhost:5000/api';

// Menu items data organized by category and subcategory
const menuData = {
  // BEVERAGES
  Coffee: [
    { code: 'CAF', name: 'Café Americano', pricing: { 'Hot (S)': 55, 'Hot (M)': 75, 'Cold (M)': 60, 'Cold (L)': 80, 'Float (M)': 80, 'Float (L)': 100 } },
    { code: 'SCL', name: 'Spanish Café Latte', pricing: { 'Hot (S)': 65, 'Hot (M)': 80, 'Cold (M)': 80, 'Cold (L)': 105, 'Float (M)': 95, 'Float (L)': 125 } },
    { code: 'MOC', name: 'Mocha', pricing: { 'Hot (S)': 65, 'Hot (M)': 80, 'Cold (M)': 80, 'Cold (L)': 105, 'Float (M)': 95, 'Float (L)': 125 } },
    { code: 'CAP', name: 'Cappuccino', pricing: { 'Hot (S)': 65, 'Hot (M)': 80, 'Cold (M)': 80, 'Cold (L)': 105, 'Float (M)': 95, 'Float (L)': 125 } },
    { code: 'CAM', name: 'Caramel Macchiato', pricing: { 'Hot (S)': 65, 'Hot (M)': 80, 'Cold (M)': 80, 'Cold (L)': 105, 'Float (M)': 95, 'Float (L)': 125 } },
    { code: 'MCL', name: 'Matcha Café Latte', pricing: { 'Hot (S)': 65, 'Hot (M)': 80, 'Cold (M)': 80, 'Cold (L)': 105, 'Float (M)': 95, 'Float (L)': 125 } }
  ],
  'Non-Coffee (Milk-Based)': [
    { code: 'CHL', name: 'Choco Latte', pricing: { 'Hot (S)': 60, 'Hot (M)': 80, 'Cold (M)': 80, 'Cold (L)': 105, 'Float (M)': 95, 'Float (L)': 125 } },
    { code: 'MTL', name: 'Matcha Latte', pricing: { 'Hot (S)': 60, 'Hot (M)': 80, 'Cold (M)': 80, 'Cold (L)': 105, 'Float (M)': 95, 'Float (L)': 125 } },
    { code: 'STM', name: 'Strawberry Matcha', pricing: { 'Hot (M)': 80, 'Cold (M)': 80, 'Cold (L)': 105, 'Float (M)': 95, 'Float (L)': 125 } },
    { code: 'STN', name: 'Strawberry Nutella', pricing: { 'Hot (M)': 80, 'Cold (M)': 80, 'Cold (L)': 105, 'Float (M)': 95, 'Float (L)': 125 } }
  ],
  'Fruit Tea': [
    { code: 'LFT', name: 'Lychee Fruit Tea', pricing: { 'Medium': 49, 'Large': 59 } },
    { code: 'SFT', name: 'Strawberry Fruit Tea', pricing: { 'Medium': 49, 'Large': 59 } },
    { code: 'BFT', name: 'Blueberry Fruit Tea', pricing: { 'Medium': 49, 'Large': 59 } },
    { code: 'PFT', name: 'Passion Fruit Tea', pricing: { 'Medium': 49, 'Large': 59 } }
  ],
  'Fruit Soda': [
    { code: 'LFS', name: 'Lychee Fruit Soda', pricing: { 'Medium': 49, 'Large': 65 } },
    { code: 'SFS', name: 'Strawberry Fruit Soda', pricing: { 'Medium': 49, 'Large': 65 } },
    { code: 'BFS', name: 'Blueberry Fruit Soda', pricing: { 'Medium': 49, 'Large': 65 } },
    { code: 'PFS', name: 'Passion Fruit Soda', pricing: { 'Medium': 49, 'Large': 65 } }
  ],  'Milktea': [
    { code: 'BSM', name: 'Brown Sugar Milktea', pricing: { 'Medium': 65, 'Large': 85 } },
    { code: 'MAM', name: 'Matcha Milktea', pricing: { 'Medium': 65, 'Large': 85 } },
    { code: 'STM2', name: 'Strawberry Milktea', pricing: { 'Medium': 49, 'Large': 59 } },
    { code: 'CHM', name: 'Chocolate Milktea', pricing: { 'Medium': 49, 'Large': 59 } },
    { code: 'CCM', name: 'Cookies & Cream Milktea', pricing: { 'Medium': 49, 'Large': 59 } }
  ],
  'Yogurt Smoothies': [
    { code: 'LYS', name: 'Lychee Yogurt Smoothie', pricing: { 'Medium': 85 } },
    { code: 'SYS', name: 'Strawberry Yogurt Smoothie', pricing: { 'Medium': 85 } },
    { code: 'BYS', name: 'Blueberry Yogurt Smoothie', pricing: { 'Medium': 85 } },
    { code: 'PYS', name: 'Passion Fruit Yogurt Smoothie', pricing: { 'Medium': 85 } },
    { code: 'MYS', name: 'Mixed Berries Yogurt Smoothie', pricing: { 'Medium': 85 } },
    { code: 'MGS', name: 'Mango Yogurt Smoothie', pricing: { 'Medium': 85 } }
  ],
  'Fresh Lemonade': [
    { code: 'CFL', name: 'Classic Fresh Lemonade', pricing: { 'Medium': 49, 'Large': 59 } },
    { code: 'BTL', name: 'Black Tea Lemonade', pricing: { 'Medium': 49, 'Large': 59 } },
    { code: 'CUL', name: 'Cucumber Lemon', pricing: { 'Medium': 65, 'Large': 80 } },
    { code: 'STL', name: 'Strawberry Lemonade', pricing: { 'Medium': 65, 'Large': 80 } },
    { code: 'BLL', name: 'Blueberry Lemonade', pricing: { 'Medium': 70, 'Large': 85 } },
    { code: 'YAL', name: 'Yakult Lemonade', pricing: { 'Medium': 75, 'Large': 90 } },
    { code: 'OLL', name: 'Orange & Lemon', pricing: { 'Medium': 95 } }
  ],  'Frappe': [
    { code: 'CCF', name: 'Cookies & Cream Frappe', pricing: { 'Medium': 95, 'Large': 125 } },
    { code: 'STF', name: 'Strawberry Frappe', pricing: { 'Medium': 95, 'Large': 125 } },
    { code: 'CJF', name: 'Choco Java Frappe', pricing: { 'Medium': 95, 'Large': 125 } },
    { code: 'CAF2', name: 'Caramel Cream Frappe', pricing: { 'Medium': 95, 'Large': 125 } },
    { code: 'MCF', name: 'Mango Caramel Frappe', pricing: { 'Medium': 95, 'Large': 125 } },
    { code: 'MOF', name: 'Mocha Frappe', pricing: { 'Medium': 95, 'Large': 125 } }
  ]
};

const mealsData = {
  'Breakfast All Day': [
    { code: 'BBS', name: 'Boneless Bangsilog', pricing: { 'base': 145 } },
    { code: 'BPC', name: 'Breaded Porkchop', pricing: { 'base': 125 } },
    { code: 'CTL', name: 'Classic Tocilog', pricing: { 'base': 135 } },
    { code: 'BLF', name: 'Bangus liempo feast', pricing: { 'base': 220 } },
    { code: 'HPB', name: 'Hickory Pork Belly', pricing: { 'base': 185 } },
    { code: 'PGP', name: 'Pan grilled Porkchops', pricing: { 'base': 190 } }
  ],
  'Snacks': [
    { code: 'CCD', name: 'Classic Corndog', pricing: { 'base': 55 } },
    { code: 'PCD', name: 'Potato Corndog', pricing: { 'base': 65 } },
    { code: 'MZD', name: 'Mozzadog', pricing: { 'base': 75 } },
    { code: 'CFB', name: 'Chicken fillet burger', pricing: { 'base': 85 } },
    { code: 'CCK', name: 'Chunkie chicken Kebab', pricing: { 'base': 99 } },
    { code: 'CST', name: 'Cheese sticks', pricing: { 'base': 99 } },
    { code: 'FFR', name: 'French Fries', pricing: { 'base': 55 } }
  ],
  'Flavored Wings': [
    { code: 'UAW', name: 'UNLI ALL WINGS, FRIES, RICE, ICED TEA', pricing: { 'base': 365 } },
    { code: 'BSO', name: 'Big Solo (9 pcs. wings, fries, unli rice, choice of drinks)', pricing: { 'base': 265 } },
    { code: 'WNF', name: 'Wings & Fries (6 pcs. wings with fries)', pricing: { 'base': 199 } },
    { code: 'BLP', name: '40 pcs. BILAO PACK', pricing: { 'base': 899 } },
    { code: 'WBX', name: '20 pcs. WINGBOX', pricing: { 'base': 449 } },
    { code: 'W5R', name: '5 pcs. wings with rice', pricing: { 'base': 145 } },
    { code: 'W3R', name: '3 pcs. wings with rice', pricing: { 'base': 99 } },
    { code: 'CBK', name: 'Chicken balls ala king', pricing: { 'base': 109 } },
    { code: 'CBM', name: 'Chicken bites Meal', pricing: { 'base': 99 } }
  ]
};

// Add-ons data
const addOnsData = [
  { name: 'Tapioca Pearls', price: 15, category: 'Beverages' },
  { name: 'Nata', price: 15, category: 'Beverages' },
  { name: 'Nutella', price: 15, category: 'Beverages' },
  { name: 'Cream Puff', price: 15, category: 'Beverages' }
];

async function createMenuItem(item, category, subCategory) {
  const payload = {
    code: item.code,
    name: item.name,
    category: category,
    subCategory: subCategory,
    description: `Delicious ${item.name.toLowerCase()}`,
    pricing: JSON.stringify(item.pricing),
    modifiers: JSON.stringify([]),
    preparationTime: 15,
    isAvailable: true,
    ingredients: JSON.stringify([])
  };

  try {
    const response = await fetch(`${API_BASE}/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error for ${item.name}: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json();
    console.log(`✅ Created: ${item.name} (${item.code})`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to create ${item.name}: ${error.message}`);
    return null;
  }
}

async function createAddOn(addOn) {
  try {
    const response = await fetch(`${API_BASE}/add-ons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addOn)
    });    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error for add-on ${addOn.name}: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json();
    console.log(`✅ Created Add-on: ${addOn.name} - ₱${addOn.price}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to create add-on ${addOn.name}: ${error.message}`);
    return null;
  }
}

async function populateMenu() {
  console.log('🚀 Starting menu population...\n');

  // Create Add-ons first
  console.log('📝 Creating Add-ons...');
  for (const addOn of addOnsData) {
    await createAddOn(addOn);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }

  console.log('\n🍹 Creating Beverage Items...');
  // Create Beverage items
  for (const [subCategory, items] of Object.entries(menuData)) {
    console.log(`\n--- ${subCategory} ---`);
    for (const item of items) {
      await createMenuItem(item, 'Beverages', subCategory);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
  }

  console.log('\n🍽️ Creating Meal Items...');
  // Create Meal items
  for (const [subCategory, items] of Object.entries(mealsData)) {
    console.log(`\n--- ${subCategory} ---`);
    for (const item of items) {
      await createMenuItem(item, 'Meals', subCategory);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
  }

  console.log('\n🎉 Menu population completed!');
}

// Run the script
populateMenu().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
