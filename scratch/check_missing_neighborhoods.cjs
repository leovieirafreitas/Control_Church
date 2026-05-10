const https = require('https');
const fs = require('fs');

const API_KEY = 'AIzaSyAuIuAjS-p0SoRcKvVQm50TKEnJ6-QmoY8';
const currentNeighborhoods = JSON.parse(fs.readFileSync('src/utils/neighborhoodCoords.json', 'utf8'));
const currentNames = Object.keys(currentNeighborhoods);

// Algumas variações de busca para encontrar bairros, conjuntos e comunidades
const searchQueries = [
  'bairros de Manaus',
  'conjuntos habitacionais Manaus',
  'comunidades Manaus Amazonas'
];

async function checkMissing() {
  const allFound = new Set();

  for (const query of searchQueries) {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;
    
    await new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          if (json.status === 'OK') {
            json.results.forEach(r => {
              // Filtrar por tipos que parecem bairros ou sub-bairros
              if (r.types.includes('neighborhood') || r.types.includes('sublocality') || r.types.includes('political')) {
                allFound.add(r.name);
              }
            });
          }
          resolve();
        });
      });
    });
  }

  const missing = [...allFound].filter(nb => !currentNames.includes(nb));
  
  console.log('--- Resumo do Sistema ---');
  console.log('Total no Sistema:', currentNames.length);
  console.log('Encontrados no Google:', allFound.size);
  console.log('\n--- Possíveis Bairros Faltantes ou com Nomes Diferentes ---');
  missing.forEach(m => console.log(`- ${m}`));
}

checkMissing();
