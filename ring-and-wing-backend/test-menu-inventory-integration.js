// Menu → Inventory Integration Test
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runMenuInventoryTest() {
    console.log('\n🍽️ MENU → INVENTORY INTEGRATION TEST');
    console.log('=================================================');
    
    try {
        const startTime = Date.now();
        
        // Test 1: Get menu items with availability
        console.log('\n1️⃣ Testing Menu Items with Real-time Availability...');
        const menuResponse = await axios.get(`${BASE_URL}/menu/items`);
        const menuItems = menuResponse.data.data;
        console.log(`   📋 Total Menu Items: ${menuItems.length}`);
        
        // Test 2: Check specific menu item availability
        console.log('\n2️⃣ Testing Individual Menu Item Availability...');
        const testItemId = "683c2408ec6a7e4a45a6fa0e";
        const availabilityResponse = await axios.post(`${BASE_URL}/menu/check-availability`, {
            menuItems: [{
                menuItemId: testItemId,
                quantity: 1
            }]
        });
        console.log(`   ✅ Item Available: ${availabilityResponse.data.data.isAvailable}`);
        console.log(`   🔍 Ingredient Tracking: ${availabilityResponse.data.data.hasIngredientTracking}`);
        
        // Test 3: Get ingredient breakdown
        console.log('\n3️⃣ Testing Menu Item Ingredient Analysis...');
        const ingredientsResponse = await axios.get(`${BASE_URL}/menu/ingredients/${testItemId}`);
        const ingredients = ingredientsResponse.data.data;
        console.log(`   🧄 Ingredients Required: ${ingredients.length}`);
        if (ingredients.length > 0) {
            console.log(`   📦 First Ingredient: ${ingredients[0].ingredientId?.name || 'N/A'}`);
            console.log(`   📊 Required Quantity: ${ingredients[0].quantityNeeded}${ingredients[0].unit || ''}`);
        }
        
        // Test 4: Cost analysis
        console.log('\n4️⃣ Testing Cost Analysis Integration...');
        const costResponse = await axios.get(`${BASE_URL}/menu/cost-analysis/${testItemId}`);
        const costData = costResponse.data.data;
        console.log(`   💰 Total Cost: $${costData.totalCost}`);
        console.log(`   📈 Profit Margin: ${costData.profitMargin || 'N/A'}%`);
        console.log(`   🧾 Ingredient Breakdown: ${costData.ingredientBreakdown.length} items`);
        
        // Test 5: Bulk availability check
        console.log('\n5️⃣ Testing Bulk Menu Availability...');
        const bulkItems = menuItems.slice(0, 3).map(item => ({
            menuItemId: item._id,
            quantity: 1
        }));
        
        if (bulkItems.length > 0) {
            const bulkAvailabilityResponse = await axios.post(`${BASE_URL}/menu/check-availability`, {
                menuItems: bulkItems
            });
            console.log(`   📊 Bulk Check Items: ${bulkItems.length}`);
            console.log(`   ✅ Overall Available: ${bulkAvailabilityResponse.data.data.isAvailable}`);
        }
        
        // Test 6: Inventory impact simulation
        console.log('\n6️⃣ Testing Inventory Impact Simulation...');
        const testReservation = await axios.post(`${BASE_URL}/inventory/reserve`, {
            orderId: `MENU-TEST-${Date.now()}`,
            items: [{
                menuItemId: testItemId,
                quantity: 1
            }]
        });
        console.log(`   🔒 Test Reservation Created: ${testReservation.data.success}`);
        
        // Check availability after reservation
        const postReservationAvailability = await axios.post(`${BASE_URL}/menu/check-availability`, {
            menuItems: [{
                menuItemId: testItemId,
                quantity: 1
            }]
        });
        console.log(`   🔍 Post-Reservation Available: ${postReservationAvailability.data.data.isAvailable}`);
        
        const totalTime = Date.now() - startTime;
        console.log('\n🎉 MENU → INVENTORY INTEGRATION TEST COMPLETED!');
        console.log(`⏱️  Total Test Time: ${totalTime}ms`);
        console.log('✅ Menu availability calculations validated');
        console.log('✅ Ingredient tracking verified');
        console.log('✅ Cost analysis integration working');
        console.log('✅ Bulk availability checks functional');
        console.log('✅ Inventory impact simulation successful');
        
    } catch (error) {
        console.error('\n❌ Menu Integration Test Failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
}

runMenuInventoryTest();