const https = require('https');

const API_KEY = 'AIzaSyAuIuAjS-p0SoRcKvVQm50TKEnJ6-QmoY8';
const url = `https://maps.googleapis.com/maps/api/staticmap?center=-3.100,-60.000&zoom=13&size=600x300&maptype=roadmap&key=${API_KEY}`;

console.log('Testing Google Maps Static API...');

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  
  if (res.statusCode === 200) {
    console.log('✅ Static Maps API is WORKING!');
  } else {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('❌ API Error:', data);
    });
  }
}).on('error', (err) => {
  console.log('Error:', err.message);
});
