// Quick outbound IP check for Render backend
const https = require('https');

function fetchIp(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data.trim()));
      })
      .on('error', reject);
  });
}

(async () => {
  try {
    const ip = await fetchIp('https://ifconfig.me/ip');
    console.log('Outbound IP:', ip);
    process.exit(0);
  } catch (err) {
    console.error('IP check failed:', err.message);
    process.exit(1);
  }
})();
