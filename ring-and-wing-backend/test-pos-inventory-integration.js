/**
 * POS → Inventory Integration Test
 * Simulates real Point of Sale workflows with inventory integration
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test data - simulating real POS scenarios
const TEST_SCENARIOS = {
  // Scenario 1: Single item order
  singleItemOrder: {
    orderId: 'POS-001',
    customerName: 'John Doe',
    items: [
      { menuItemId: '683c2408ec6a7e4a45a6fa0e', quantity: 1, name: 'Boneless Bangsilog' }
    ]
  },
  
  // Scenario 2: Multiple item order
  multipleItemOrder: {
    orderId: 'POS-002', 
    customerName: 'Jane Smith',
    items: [
      { menuItemId: '683c2408ec6a7e4a45a6fa0e', quantity: 2, name: 'Boneless Bangsilog' },
      { menuItemId: '683c2408ec6a7e4a45a6fa0e', quantity: 1, name: 'Boneless Bangsilog' }
    ]
  },
  
  // Scenario 3: High volume order (stress test)
  highVolumeOrder: {
    orderId: 'POS-003',
    customerName: 'Catering Order',
    items: [
      { menuItemId: '683c2408ec6a7e4a45a6fa0e', quantity: 10, name: 'Boneless Bangsilog' }
    ]
  }
};

// Test utilities
const testResults = [];
function logTest(testName, success, details = '', duration = 0) {
  const status = success ? '✅ PASSED' : '❌ FAILED';
  const result = `${status} ${testName}${details ? ' - ' + details : ''}${duration ? ` (${duration}ms)` : ''}`;
  console.log(result);
  testResults.push({ testName, success, details, duration });
  return success;
}

function logStep(stepName, data = null) {
  console.log(`📍 ${stepName}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`);
}

/**
 * Test 1: POS Order Availability Check
 * Before placing an order, POS checks if items are available
 */
async function testOrderAvailabilityCheck() {
  console.log('🛒 Testing POS Order Availability Check...\n');
  
  try {
    const startTime = Date.now();
    
    // Step 1: POS requests availability check
    logStep('POS requests availability for order', TEST_SCENARIOS.singleItemOrder.items);
    
    const availabilityResponse = await axios.post(`${BASE_URL}/api/menu/check-availability`, {
      orderItems: TEST_SCENARIOS.singleItemOrder.items
    });
    
    const duration = Date.now() - startTime;
    
    // Validate response
    const isAvailable = availabilityResponse.data.data.isAvailable;
    const hasIngredientTracking = availabilityResponse.data.data.hasIngredientTracking;
    
    logStep('Availability Response', {
      available: isAvailable,
      hasTracking: hasIngredientTracking,
      itemCount: availabilityResponse.data.data.itemAvailabilities.length
    });
    
    logTest('POS Availability Check', isAvailable !== undefined, 
           `Available: ${isAvailable}, Tracking: ${hasIngredientTracking}`, duration);
    
    return availabilityResponse.data.data;
    
  } catch (error) {
    logTest('POS Availability Check', false, error.message);
    return null;
  }
}

/**
 * Test 2: Inventory Reservation on Order Placement
 * When POS places an order, inventory should be reserved
 */
async function testInventoryReservationOnOrder() {
  console.log('\n📦 Testing Inventory Reservation on Order Placement...\n');
  
  try {
    const startTime = Date.now();
    
    // Step 1: POS places order and requests inventory reservation
    logStep('POS places order and reserves inventory', TEST_SCENARIOS.singleItemOrder);
    
    const reservationResponse = await axios.post(`${BASE_URL}/api/inventory/reserve`, {
      orderId: TEST_SCENARIOS.singleItemOrder.orderId,
      items: TEST_SCENARIOS.singleItemOrder.items,
      customerName: TEST_SCENARIOS.singleItemOrder.customerName
    });
    
    const duration = Date.now() - startTime;
    
    // Validate reservation was created
    const reservationData = reservationResponse.data.data;
    const reservationCreated = reservationData.success && reservationData.data.reservationId;
    
    logStep('Reservation Response', {
      reservationId: reservationData.data.reservationId,
      status: reservationData.data.status,
      orderId: reservationData.data.orderId
    });
    
    logTest('Inventory Reservation Creation', !!reservationCreated, 
           `Reservation ID: ${reservationData.data.reservationId}`, duration);
    
    return reservationData.data;
    
  } catch (error) {
    logTest('Inventory Reservation Creation', false, error.message);
    return null;
  }
}

/**
 * Test 3: Real-time Inventory Status Updates
 * After reservation, check if inventory alerts are updated
 */
async function testInventoryStatusUpdates() {
  console.log('\n📊 Testing Real-time Inventory Status Updates...\n');
  
  try {
    const startTime = Date.now();
    
    // Step 1: Check inventory alerts after reservation
    logStep('Checking inventory alerts after reservation');
    
    const alertsResponse = await axios.get(`${BASE_URL}/api/inventory/alerts`);
    const duration = Date.now() - startTime;
    
    // Validate alerts are generated
    const alerts = alertsResponse.data.data.alerts;
    const hasAlerts = alerts && alerts.length > 0;
    const criticalAlerts = alerts.filter(alert => alert.priority === 'critical').length;
    
    logStep('Alert Response', {
      totalAlerts: alerts.length,
      criticalAlerts: criticalAlerts,
      summary: alertsResponse.data.data.summary
    });
    
    logTest('Inventory Status Updates', hasAlerts, 
           `${alerts.length} alerts generated, ${criticalAlerts} critical`, duration);
    
    return alerts;
    
  } catch (error) {
    logTest('Inventory Status Updates', false, error.message);
    return null;
  }
}

/**
 * Test 4: Multiple Order Handling
 * Test concurrent orders and inventory management
 */
async function testMultipleOrderHandling() {
  console.log('\n🔄 Testing Multiple Order Handling...\n');
  
  try {
    const startTime = Date.now();
    
    // Step 1: Place multiple orders simultaneously
    logStep('Placing multiple orders simultaneously');
    
    const orderPromises = [
      axios.post(`${BASE_URL}/api/inventory/reserve`, {
        orderId: TEST_SCENARIOS.multipleItemOrder.orderId,
        items: TEST_SCENARIOS.multipleItemOrder.items,
        customerName: TEST_SCENARIOS.multipleItemOrder.customerName
      }),
      axios.post(`${BASE_URL}/api/inventory/reserve`, {
        orderId: 'POS-004',
        items: [{ menuItemId: '683c2408ec6a7e4a45a6fa0e', quantity: 1 }],
        customerName: 'Concurrent Customer'
      })
    ];
    
    const results = await Promise.allSettled(orderPromises);
    const duration = Date.now() - startTime;
    
    const successfulOrders = results.filter(result => result.status === 'fulfilled').length;
    const failedOrders = results.filter(result => result.status === 'rejected').length;
    
    logStep('Multiple Orders Result', {
      successful: successfulOrders,
      failed: failedOrders,
      total: results.length
    });
    
    logTest('Multiple Order Handling', successfulOrders > 0, 
           `${successfulOrders}/${results.length} orders processed`, duration);
    
    return results;
    
  } catch (error) {
    logTest('Multiple Order Handling', false, error.message);
    return null;
  }
}

/**
 * Test 5: Order-to-Fulfillment Workflow
 * Complete workflow from order placement to fulfillment
 */
async function testOrderToFulfillmentWorkflow() {
  console.log('\n🔄 Testing Complete Order-to-Fulfillment Workflow...\n');
  
  try {
    const workflowStart = Date.now();
    
    // Step 1: Check availability
    logStep('1. POS checks item availability');
    const availability = await axios.post(`${BASE_URL}/api/menu/check-availability`, {
      orderItems: TEST_SCENARIOS.singleItemOrder.items
    });
    
    if (!availability.data.data.isAvailable) {
      logTest('Order-to-Fulfillment Workflow', false, 'Items not available');
      return null;
    }
    
    // Step 2: Create reservation
    logStep('2. POS creates inventory reservation');
    const reservation = await axios.post(`${BASE_URL}/api/inventory/reserve`, {
      orderId: 'WORKFLOW-001',
      items: TEST_SCENARIOS.singleItemOrder.items
    });
    
    // Step 3: Check active reservations
    logStep('3. Checking active reservations');
    const activeReservations = await axios.get(`${BASE_URL}/api/inventory/reservations`);
    
    // Step 4: Generate cost analysis
    logStep('4. Generate cost analysis for order');
    const costAnalysis = await axios.get(`${BASE_URL}/api/menu/cost-analysis/683c2408ec6a7e4a45a6fa0e`);
    
    // Step 5: Check updated inventory alerts
    logStep('5. Check updated inventory status');
    const updatedAlerts = await axios.get(`${BASE_URL}/api/inventory/alerts`);
    
    const workflowDuration = Date.now() - workflowStart;
    
    logStep('Workflow Complete', {
      steps: 5,
      totalDuration: workflowDuration,
      averageStepTime: Math.round(workflowDuration / 5)
    });
    
    logTest('Complete Order-to-Fulfillment Workflow', true, 
           `5 steps completed successfully`, workflowDuration);
    
    return {
      availability: availability.data.data,
      reservation: reservation.data.data,
      activeReservations: activeReservations.data.data,
      costAnalysis: costAnalysis.data.data,
      alerts: updatedAlerts.data.data
    };
    
  } catch (error) {
    logTest('Order-to-Fulfillment Workflow', false, error.message);
    return null;
  }
}

/**
 * Test 6: Stress Test - High Volume Orders
 * Test system behavior under high order volume
 */
async function testHighVolumeOrders() {
  console.log('\n💪 Testing High Volume Order Processing...\n');
  
  try {
    const startTime = Date.now();
    
    // Create multiple high-volume orders
    const orderPromises = [];
    for (let i = 1; i <= 5; i++) {
      orderPromises.push(
        axios.post(`${BASE_URL}/api/inventory/reserve`, {
          orderId: `STRESS-${i}`,
          items: [{ 
            menuItemId: '683c2408ec6a7e4a45a6fa0e', 
            quantity: 2,
            name: 'Stress Test Order'
          }]
        })
      );
    }
    
    logStep('Processing 5 concurrent high-volume orders');
    
    const results = await Promise.allSettled(orderPromises);
    const duration = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const avgResponseTime = duration / results.length;
    
    logStep('Stress Test Results', {
      totalOrders: results.length,
      successful: successful,
      avgResponseTime: Math.round(avgResponseTime),
      totalDuration: duration
    });
    
    logTest('High Volume Order Processing', successful >= 4, 
           `${successful}/5 orders processed, avg ${Math.round(avgResponseTime)}ms`, duration);
    
    return results;
    
  } catch (error) {
    logTest('High Volume Order Processing', false, error.message);
    return null;
  }
}

/**
 * Main integration test runner
 */
async function runPOSIntegrationTests() {
  console.log('🚀 Starting POS → Inventory Integration Tests\n');
  console.log('====================================================\n');
  
  try {
    // Test server availability
    await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running and accessible\n');
    
    // Run all integration tests
    await testOrderAvailabilityCheck();
    await testInventoryReservationOnOrder();
    await testInventoryStatusUpdates();
    await testMultipleOrderHandling();
    await testOrderToFulfillmentWorkflow();
    await testHighVolumeOrders();
    
  } catch (error) {
    console.error('❌ Integration tests failed to start:', error.message);
    return;
  }
  
  // Summary
  console.log('\n====================================================');
  console.log('🏁 POS → Inventory Integration Testing Complete\n');
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(result => result.success).length;
  const failedTests = totalTests - passedTests;
  const avgDuration = testResults.reduce((sum, result) => sum + result.duration, 0) / totalTests;
  
  console.log(`📊 Integration Test Results:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log(`   ⏱️ Average Response Time: ${Math.round(avgDuration)}ms\n`);
  
  if (failedTests > 0) {
    console.log('❌ Failed Tests:');
    testResults.filter(result => !result.success).forEach(result => {
      console.log(`   - ${result.testName}: ${result.details}`);
    });
    console.log('');
  }
  
  // Integration Health Assessment
  const healthScore = (passedTests / totalTests) * 100;
  let healthStatus = 'POOR';
  if (healthScore >= 90) healthStatus = 'EXCELLENT';
  else if (healthScore >= 75) healthStatus = 'GOOD';
  else if (healthScore >= 60) healthStatus = 'FAIR';
  
  console.log(`🎯 POS → Inventory Integration Health: ${healthStatus} (${Math.round(healthScore)}%)`);
  console.log(`🚀 ${healthScore >= 75 ? 'Ready for production workflows!' : 'Needs optimization before production'}\n`);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runPOSIntegrationTests().catch(error => {
    console.error('💥 Integration test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runPOSIntegrationTests };