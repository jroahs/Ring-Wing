// Check backend connectivity script
const axios = require('axios');

async function checkBackendConnectivity() {
  try {
    console.log('Checking backend connectivity...');
    
    // 1. Check basic health endpoint
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('Health endpoint response:', healthResponse.data);
    
    // 2. Try to authenticate (requires credentials)
    // Replace with valid credentials for your system
    const loginPayload = {
      email: 'admin@example.com', // replace with valid credentials
      password: 'adminpassword'   // replace with valid credentials
    };
    
    try {
      const authResponse = await axios.post('http://localhost:5000/api/auth/login', loginPayload);
      console.log('Authentication successful!');
      console.log('Auth token:', authResponse.data.token);
      
      // 3. Try fetching staff with token
      const token = authResponse.data.token;
      const staffResponse = await axios.get('http://localhost:5000/api/staff', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Staff data fetch successful!');
      console.log(`Retrieved ${staffResponse.data.length} staff records`);
    } catch (authError) {
      console.error('Authentication failed:', authError.response?.data || authError.message);
      // Even if authentication fails, the API should be reachable
      console.log('Backend is reachable but authentication failed - check credentials');
    }
    
  } catch (error) {
    console.error('Backend connectivity error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Backend server is not running or not accessible at http://localhost:5000');
      console.log('Make sure your backend server is running with:');
      console.log('1. Navigate to backend directory: cd ring-and-wing-backend');
      console.log('2. Start the server: node server.js');
    } else if (error.response) {
      console.error('Backend responded with error:', error.response.status, error.response.data);
    } else {
      console.error('Network or other error occurred');
    }
  }
}

checkBackendConnectivity();
