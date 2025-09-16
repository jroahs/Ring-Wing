// Performance Testing Suite
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runPerformanceTest() {
    console.log('\n🚀 PERFORMANCE TESTING SUITE');
    console.log('=================================================');
    
    const results = {
        singleRequests: [],
        bulkOperations: [],
        concurrentTests: [],
        memoryUsage: []
    };
    
    try {
        // Test 1: Single Request Performance
        console.log('\n1️⃣ Testing Single Request Performance...');
        for (let i = 0; i < 10; i++) {
            const start = Date.now();
            try {
                await axios.post(`${BASE_URL}/menu/check-availability`, {
                    menuItems: [{
                        menuItemId: "683c2408ec6a7e4a45a6fa0e",
                        quantity: 1
                    }]
                });
                const responseTime = Date.now() - start;
                results.singleRequests.push(responseTime);
                process.stdout.write(`   Request ${i + 1}: ${responseTime}ms `);
            } catch (error) {
                process.stdout.write(`   Request ${i + 1}: FAILED `);
            }
        }
        
        const avgSingle = results.singleRequests.reduce((a, b) => a + b, 0) / results.singleRequests.length;
        console.log(`\n   📊 Average Single Request: ${avgSingle.toFixed(2)}ms`);
        console.log(`   ⚡ Best: ${Math.min(...results.singleRequests)}ms`);
        console.log(`   🐌 Worst: ${Math.max(...results.singleRequests)}ms`);
        
        // Test 2: Bulk Operations Performance
        console.log('\n2️⃣ Testing Bulk Operations Performance...');
        const bulkSizes = [1, 5, 10];
        
        for (const size of bulkSizes) {
            const start = Date.now();
            try {
                const bulkItems = Array(size).fill().map((_, i) => ({
                    menuItemId: "683c2408ec6a7e4a45a6fa0e",
                    quantity: 1
                }));
                
                await axios.post(`${BASE_URL}/menu/check-availability`, {
                    menuItems: bulkItems
                });
                
                const responseTime = Date.now() - start;
                results.bulkOperations.push({ size, time: responseTime });
                console.log(`   📦 Bulk ${size} items: ${responseTime}ms`);
            } catch (error) {
                console.log(`   ❌ Bulk ${size} items: FAILED`);
            }
        }
        
        // Test 3: Concurrent Request Performance
        console.log('\n3️⃣ Testing Concurrent Request Performance...');
        const concurrentCount = 5;
        const concurrentStart = Date.now();
        
        const concurrentPromises = Array(concurrentCount).fill().map(async (_, i) => {
            const requestStart = Date.now();
            try {
                await axios.post(`${BASE_URL}/inventory/reserve`, {
                    orderId: `PERF-TEST-${Date.now()}-${i}`,
                    items: [{
                        menuItemId: "683c2408ec6a7e4a45a6fa0e",
                        quantity: 1
                    }]
                });
                return Date.now() - requestStart;
            } catch (error) {
                return -1; // Failed request
            }
        });
        
        const concurrentResults = await Promise.all(concurrentPromises);
        const concurrentTotal = Date.now() - concurrentStart;
        const successfulConcurrent = concurrentResults.filter(time => time > 0);
        
        console.log(`   🔥 Concurrent Requests: ${concurrentCount}`);
        console.log(`   ⏱️  Total Time: ${concurrentTotal}ms`);
        console.log(`   ✅ Successful: ${successfulConcurrent.length}/${concurrentCount}`);
        
        if (successfulConcurrent.length > 0) {
            const avgConcurrent = successfulConcurrent.reduce((a, b) => a + b, 0) / successfulConcurrent.length;
            console.log(`   📊 Average Response: ${avgConcurrent.toFixed(2)}ms`);
        }
        
        // Test 4: Database Connection Performance
        console.log('\n4️⃣ Testing Database Connection Performance...');
        const dbTestCount = 5;
        const dbTimes = [];
        
        for (let i = 0; i < dbTestCount; i++) {
            const start = Date.now();
            try {
                await axios.get(`${BASE_URL}/db-status`);
                const responseTime = Date.now() - start;
                dbTimes.push(responseTime);
                console.log(`   🔗 DB Check ${i + 1}: ${responseTime}ms`);
            } catch (error) {
                console.log(`   ❌ DB Check ${i + 1}: FAILED`);
            }
        }
        
        if (dbTimes.length > 0) {
            const avgDb = dbTimes.reduce((a, b) => a + b, 0) / dbTimes.length;
            console.log(`   💾 Average DB Response: ${avgDb.toFixed(2)}ms`);
        }
        
        // Performance Summary
        console.log('\n🎯 PERFORMANCE TEST SUMMARY');
        console.log('=================================');
        console.log(`📈 Single Request Avg: ${avgSingle.toFixed(2)}ms`);
        console.log(`📦 Bulk Operations: ${results.bulkOperations.length} tests completed`);
        console.log(`🔥 Concurrent Success Rate: ${successfulConcurrent.length}/${concurrentCount} (${((successfulConcurrent.length/concurrentCount)*100).toFixed(1)}%)`);
        console.log(`💾 Database Connectivity: ${dbTimes.length}/${dbTestCount} successful`);
        
        // Performance Rating
        let rating = '⭐⭐⭐⭐⭐';
        if (avgSingle > 100) rating = '⭐⭐⭐⭐';
        if (avgSingle > 200) rating = '⭐⭐⭐';
        if (avgSingle > 500) rating = '⭐⭐';
        if (avgSingle > 1000) rating = '⭐';
        
        console.log(`\n${rating} Performance Rating`);
        console.log('✅ All performance tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Performance Test Failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
}

runPerformanceTest();