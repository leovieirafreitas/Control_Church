const https = require('https');

const API_KEY = 'AIzaSyAuIuAjS-p0SoRcKvVQm50TKEnJ6-QmoY8';
const neighborhood = 'Cidade Nova, Manaus, Amazonas';
const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(neighborhood)}&key=${API_KEY}`;

console.log(`Testing Google Maps Geocoding API for: ${neighborhood}...`);

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.status === 'OK') {
      console.log('✅ API is WORKING!');
      console.log('Result:', json.results[0].formatted_address);
      console.log('Location:', json.results[0].geometry.location);
    } else {
      console.log('❌ API Error:', json.status);
      if (json.error_message) console.log('Message:', json.error_message);
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
