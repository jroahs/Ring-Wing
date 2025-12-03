/**
 * Test Script: Verify Schedule-Based Deductions
 * 
 * This script tests if the /api/schedules/compare/:staffId endpoint
 * correctly returns late minutes and absences from schedule data.
 * 
 * Run: node scripts/test-schedule-deductions.js <auth-token>
 * 
 * Get your auth token from the browser:
 * 1. Open DevTools (F12) 
 * 2. Go to Application > Local Storage
 * 3. Copy the value of 'token'
 */

const API_BASE = process.env.API_URL || 'https://ring-wing-backend.onrender.com';
const AUTH_TOKEN = process.argv[2] || process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.log('❌ Missing auth token!');
  console.log('');
  console.log('Usage: node scripts/test-schedule-deductions.js <auth-token>');
  console.log('');
  console.log('Get your token from browser DevTools > Application > Local Storage > token');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testScheduleDeductions() {
  console.log('='.repeat(60));
  console.log('Testing Schedule-Based Deductions');
  console.log('='.repeat(60));
  console.log(`API: ${API_BASE}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Step 1: Get list of staff
    console.log('[1] Fetching staff list...');
    const staffRes = await fetch(`${API_BASE}/api/staff`, { headers });
    const staffData = await staffRes.json();
    
    // Handle different response formats
    let staffList = [];
    if (Array.isArray(staffData)) {
      staffList = staffData;
    } else if (staffData.data && Array.isArray(staffData.data)) {
      staffList = staffData.data;
    } else if (staffData.staff && Array.isArray(staffData.staff)) {
      staffList = staffData.staff;
    }
    
    if (staffList.length === 0) {
      console.log('❌ No staff found! Response:', JSON.stringify(staffData).substring(0, 200));
      return;
    }
    
    console.log(`✓ Found ${staffList.length} staff members`);
    
    // Step 2: Test comparison for each active staff member
    const activeStaff = staffList.filter(s => s.status === 'Active').slice(0, 3);
    
    for (const staff of activeStaff) {
      const staffName = staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Unknown';
      console.log('');
      console.log('-'.repeat(50));
      console.log(`Testing: ${staffName} (${staff._id})`);
      console.log('-'.repeat(50));
      
      // Get current month's date range
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      console.log(`Date range: ${startDate} to ${endDate}`);
      
      const compareUrl = `${API_BASE}/api/schedules/compare/${staff._id}?startDate=${startDate}&endDate=${endDate}`;
      console.log(`Fetching: ${compareUrl}`);
      
      const compareRes = await fetch(compareUrl, { headers });
      const compareData = await compareRes.json();
      
      if (!compareRes.ok) {
        console.log(`❌ Error: ${compareData.message || 'Unknown error'}`);
        continue;
      }
      
      // Handle nested response format
      const responseData = compareData.data || compareData;
      const { comparison, summary, gracePeriodMinutes } = responseData;
      
      console.log('');
      console.log('📊 Summary:');
      console.log(`   Grace Period: ${gracePeriodMinutes} minutes`);
      console.log(`   Total Schedules: ${comparison?.length || 0}`);
      console.log(`   Days Worked: ${summary?.daysWorked || 0}`);
      console.log(`   Days Absent: ${summary?.daysAbsent || 0}`);
      console.log(`   Late (No Clock-in): ${summary?.lateNoClockinCount || 0}`);
      console.log(`   Awaiting Clock-in: ${summary?.awaitingClockinCount || 0}`);
      console.log(`   Total Late Minutes: ${summary?.totalLateMinutes || 0}`);
      console.log(`   Total Overtime Minutes: ${summary?.totalOvertimeMinutes || 0}`);
      
      // Show individual schedule details
      if (comparison && comparison.length > 0) {
        console.log('');
        console.log('📅 Schedule Details (last 5 days):');
        const recentSchedules = comparison.slice(-5);
        
        for (const sched of recentSchedules) {
          const date = new Date(sched.date).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
          const status = sched.status;
          const scheduled = sched.schedule?.startTime 
            ? `${sched.schedule.startTime} - ${sched.schedule.endTime}`
            : 'Rest Day';
          const clockIn = sched.actual?.clockIn 
            ? new Date(sched.actual.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '-';
          const clockOut = sched.actual?.clockOut
            ? new Date(sched.actual.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '-';
          const late = sched.variance?.lateMinutes || 0;
          
          console.log(`   ${date}: [${status}] Sched: ${scheduled} | In: ${clockIn} Out: ${clockOut} | Late: ${late}m`);
        }
      }
      
      // Test what PayrollSystem would receive
      console.log('');
      console.log('💰 Payroll Auto-Fill Values:');
      console.log(`   Absences: ${summary?.daysAbsent || 0}`);
      console.log(`   Late Minutes: ${summary?.totalLateMinutes || 0}`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Test Complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testScheduleDeductions();
