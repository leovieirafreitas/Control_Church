const https = require('https');
const fs = require('fs');

const API_KEY = 'AIzaSyAuIuAjS-p0SoRcKvVQm50TKEnJ6-QmoY8';
const COORDS_FILE = 'src/utils/neighborhoodCoords.json';

// Coordenada genérica que o Google retorna para "Manaus" quando não acha o local exato
const GENERIC_MANAUS = [-3.1190275, -60.0217314];

let currentCoords = JSON.parse(fs.readFileSync(COORDS_FILE, 'utf8'));

async function geocodeWithContext(nb, context = '') {
  return new Promise((resolve) => {
    // Adicionamos "Cidade Nova" para Núcleos e contextos extras para outros
    const fullQuery = `${nb}${context ? ', ' + context : ''}, Manaus, Amazonas, Brasil`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullQuery)}&key=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results.length > 0) {
            const { lat, lng } = json.results[0].geometry.location;
            // Verifica se a nova coordenada é diferente da genérica
            if (lat.toFixed(5) === GENERIC_MANAUS[0].toFixed(5) && lng.toFixed(5) === GENERIC_MANAUS[1].toFixed(5)) {
              resolve(null);
            } else {
              resolve([lat, lng]);
            }
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function fixSuspicious() {
  console.log('🛠️ Iniciando correção de coordenadas imprecisas...');
  let fixedCount = 0;

  for (const [nb, coords] of Object.entries(currentCoords)) {
    const isGeneric = coords[0].toFixed(5) === GENERIC_MANAUS[0].toFixed(5) && coords[1].toFixed(5) === GENERIC_MANAUS[1].toFixed(5);
    const isTooFar = coords[1] > -59.7 || coords[1] < -60.2 || coords[0] > -2.8 || coords[0] < -3.3;

    if (isGeneric || isTooFar || nb.startsWith('Núcleo')) {
      let context = '';
      if (nb.startsWith('Núcleo') || nb.includes('Cidade Nova')) context = 'Cidade Nova';
      if (nb.includes('Viver Melhor')) context = 'Santa Etelvina';
      
      console.log(`🔧 Corrigindo: ${nb} (atual: [${coords}]) com contexto "${context}"...`);
      
      const newCoords = await geocodeWithContext(nb, context);
      
      if (newCoords) {
        currentCoords[nb] = newCoords;
        fixedCount++;
        console.log(`✅ ${nb} corrigido para: [${newCoords}]`);
      } else {
        console.log(`⚠️ ${nb} continua impreciso após tentativa.`);
      }
      
      await new Promise(r => setTimeout(r, 150));
    }
  }

  fs.writeFileSync(COORDS_FILE, JSON.stringify(currentCoords, null, 2));
  console.log(`\n✨ Fim da correção! ${fixedCount} locais foram reposicionados corretamente.`);
}

fixSuspicious();
