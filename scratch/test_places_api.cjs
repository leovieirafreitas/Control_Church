const https = require('https');

const API_KEY = 'AIzaSyAuIuAjS-p0SoRcKvVQm50TKEnJ6-QmoY8';
const query = 'Cidade Nova, Manaus';
const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;

console.log(`Testing Google Places API for: ${query}...`);

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.status === 'OK') {
      console.log('✅ Places API is WORKING!');
      console.log('Result:', json.results[0].formatted_address);
    } else {
      console.log('❌ API Error:', json.status);
      if (json.error_message) console.log('Message:', json.error_message);
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
