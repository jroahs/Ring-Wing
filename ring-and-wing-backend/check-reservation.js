/**
 * Quick check script - just shows reservation status
 * Run: node check-reservation.js
 */

const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing';

async function checkReservation() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const InventoryReservation = require('./models/InventoryReservation');
    
    // Check the most recent reservation
    const latestReservation = await InventoryReservation.findOne()
      .sort({ createdAt: -1 })
      .populate('orderId');

    if (latestReservation) {
      console.log('📋 Latest Reservation:');
      console.log('═'.repeat(60));
      console.log('Order ID:', latestReservation.orderId);
      console.log('Reservation ID:', latestReservation._id);
      console.log('Status:', latestReservation.status);
      console.log('Created:', latestReservation.createdAt);
      console.log('Items count:', latestReservation.reservations.length);
      console.log('\nItems:');
      latestReservation.reservations.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.quantityReserved} ${item.unit} - Status: ${item.status}`);
      });
    } else {
      console.log('⚠️ No reservations found in database');
    }

    // Check order with ID from your log
    const specificOrderId = '68dea03dcb74f16b34ad2848';
    console.log('\n\n🔍 Checking specific order:', specificOrderId);
    console.log('═'.repeat(60));
    
    const specificReservation = await InventoryReservation.findOne({ 
      orderId: mongoose.Types.ObjectId(specificOrderId) 
    });

    if (specificReservation) {
      console.log('✅ Found reservation for your order!');
      console.log('Status:', specificReservation.status);
      console.log('Items:', specificReservation.reservations.length);
    } else {
      console.log('❌ No reservation found for order:', specificOrderId);
      console.log('\nPossible reasons:');
      console.log('1. Order items have no ingredient mappings');
      console.log('2. Reservation API call failed silently');
      console.log('3. Wrong order ID format');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkReservation();
