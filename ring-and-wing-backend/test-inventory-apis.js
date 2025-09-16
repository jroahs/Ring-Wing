const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test utility functions
const logTest = (testName, result, error = null) => {
  const status = error ? '❌ FAILED' : '✅ PASSED';
  console.log(`${status} ${testName}`);
  if (error) {
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   URL: ${error.config?.url}`);
    }
  } else if (result) {
    console.log(`   Result: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`);
  }
  console.log('');
};

const testAPI = async () => {
  console.log('🧪 Testing Inventory Integration APIs\n');
  console.log('===================================================');
  
  try {
    // Test 1: Server Health Check
    try {
      const healthCheck = await axios.get(`${BASE_URL}/api/health`);
      logTest('Server Health Check', `Server running on port ${BASE_URL.split(':')[2]}`);
    } catch (error) {
      logTest('Server Health Check', null, error);
      return;
    }

    // Test 2: Menu Items Availability Check
    try {
      const availabilityCheck = await axios.post(`${BASE_URL}/api/menu/check-availability`, {
        menuItems: [
          { menuItemId: '683c2408ec6a7e4a45a6fa0e', quantity: 2 },
          { menuItemId: '683c2408ec6a7e4a45a6fa0e', quantity: 1 }
        ]
      });
      logTest('Menu Items Availability Check', availabilityCheck.data);
    } catch (error) {
      logTest('Menu Items Availability Check', null, error);
    }

    // Test 3: Create Inventory Reservation
    try {
      const reservation = await axios.post(`${BASE_URL}/api/inventory/reserve`, {
        orderId: 'test-order-123',
        items: [
          {
            menuItemId: '683c2408ec6a7e4a45a6fa0e',
            quantity: 2,
            customerName: 'Test Customer'
          }
        ],
        reservedBy: 'test-user-id'
      });
      logTest('Create Inventory Reservation', reservation.data);
    } catch (error) {
      logTest('Create Inventory Reservation', null, error);
    }

    // Test 4: Get Menu Item Ingredients
    try {
      const ingredients = await axios.get(`${BASE_URL}/api/menu/ingredients/683c2408ec6a7e4a45a6fa0e`);
      logTest('Get Menu Item Ingredients', ingredients.data);
    } catch (error) {
      logTest('Get Menu Item Ingredients', null, error);
    }

    // Test 5: Update Menu Item Ingredients
    try {
      const updateIngredients = await axios.put(`${BASE_URL}/api/menu/ingredients/683c2408ec6a7e4a45a6fa0e`, {
        ingredients: [
          {
            inventoryItemId: '6850112119d18e61e1cddeb6', // Real inventory item: Fries
            quantity: 0.2,
            unit: 'kg',
            tolerance: 0.05
          }
        ]
      });
      logTest('Update Menu Item Ingredients', updateIngredients.data);
    } catch (error) {
      logTest('Update Menu Item Ingredients', null, error);
    }

    // Test 6: Get Cost Analysis
    try {
      const costAnalysis = await axios.get(`${BASE_URL}/api/menu/cost-analysis/683c2408ec6a7e4a45a6fa0e`);
      logTest('Get Cost Analysis', costAnalysis.data);
    } catch (error) {
      logTest('Get Cost Analysis', null, error);
    }

    // Test 7: Get Inventory Alerts
    try {
      const alerts = await axios.get(`${BASE_URL}/api/inventory/alerts`);
      logTest('Get Inventory Alerts', alerts.data);
    } catch (error) {
      logTest('Get Inventory Alerts', null, error);
    }

    // Test 8: Get Active Reservations
    try {
      const reservations = await axios.get(`${BASE_URL}/api/inventory/reservations`);
      logTest('Get Active Reservations', reservations.data);
    } catch (error) {
      logTest('Get Active Reservations', null, error);
    }

    // Test 9: Generate Inventory Report
    try {
      const report = await axios.get(`${BASE_URL}/api/inventory/reports`, {
        params: {
          startDate: '2025-09-01',
          endDate: '2025-09-17',
          type: 'comprehensive'
        }
      });
      logTest('Generate Inventory Report', report.data);
    } catch (error) {
      logTest('Generate Inventory Report', null, error);
    }

    console.log('🏁 API Testing Complete\n');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
};

// Run tests
testAPI();