const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

MenuItem.find()
  .then(items => {
    console.log('Current menu items in database:');
    console.log('================================');    items.forEach(item => {
      const pricing = item.pricing || new Map();
      const firstPrice = Array.from(pricing.values())[0] || 'N/A';
      console.log(`- ${item.name} (₱${firstPrice}) - Category: ${item.category || 'None'}`);
    });
    console.log(`\nTotal items: ${items.length}`);
    
    // Check specifically for ice cream
    const iceCreamItems = items.filter(item => 
      item.name.toLowerCase().includes('ice cream') || 
      item.name.toLowerCase().includes('icecream')
    );
      if (iceCreamItems.length > 0) {
      console.log('\nIce cream items found:');
      iceCreamItems.forEach(item => {
        const pricing = item.pricing || new Map();
        console.log(`- ${item.name}: ${JSON.stringify(Object.fromEntries(pricing))}`);
      });
    } else {
      console.log('\nNo ice cream items found in database');
    }    
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    mongoose.connection.close();
    process.exit(1);
  });
