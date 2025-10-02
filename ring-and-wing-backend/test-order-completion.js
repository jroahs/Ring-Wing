/**
 * Test script to verify order completion and inventory consumption
 * Run this with: node test-order-completion.js
 */

const mongoose = require('mongoose');
const InventoryBusinessLogicService = require('./services/inventoryBusinessLogicService');

// Your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing';

async function testOrderCompletion() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Replace this with your actual order ID from the console log
    const testOrderId = '68dea03dcb74f16b34ad2848';
    const testUserId = 'test-user';

    console.log(`\n🧪 Testing order completion for: ${testOrderId}`);
    console.log('═'.repeat(60));

    // Check if reservation exists
    const InventoryReservation = require('./models/InventoryReservation');
    const reservation = await InventoryReservation.findOne({ orderId: testOrderId });
    
    if (reservation) {
      console.log('✅ Reservation found:', {
        id: reservation._id,
        status: reservation.status,
        itemCount: reservation.reservations.length,
        totalValue: reservation.totalReservedValue
      });

      console.log('\n📋 Reserved items:');
      for (const item of reservation.reservations) {
        console.log(`  - Ingredient: ${item.ingredientId}`);
        console.log(`    Quantity: ${item.quantityReserved} ${item.unit}`);
        console.log(`    Status: ${item.status}`);
      }
    } else {
      console.log('⚠️ No reservation found for this order');
      console.log('   This means either:');
      console.log('   1. The order items have no ingredient mappings');
      console.log('   2. The reservation failed during order creation');
      console.log('   3. The order ID is incorrect');
    }

    console.log('\n🏁 Attempting to complete order processing...');
    console.log('═'.repeat(60));

    const result = await InventoryBusinessLogicService.completeOrderProcessing(
      testOrderId,
      testUserId
    );

    console.log('\n📊 Result:', JSON.stringify(result, null, 2));

    if (result.success && result.hasInventoryIntegration) {
      console.log('\n✅ SUCCESS! Inventory was consumed');
      console.log(`   Items consumed: ${result.itemsConsumed}`);
      console.log(`   Value consumed: $${result.valueConsumed}`);

      // Check reservation status after consumption
      const updatedReservation = await InventoryReservation.findOne({ orderId: testOrderId });
      console.log('\n📋 Updated reservation status:', updatedReservation.status);
    } else if (result.success && !result.hasInventoryIntegration) {
      console.log('\nℹ️ Order completed without inventory tracking');
      console.log('   This order has no ingredient mappings');
    } else {
      console.log('\n❌ FAILED:', result.message);
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testOrderCompletion();
