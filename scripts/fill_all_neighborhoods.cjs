const https = require('https');
const fs = require('fs');

const API_KEY = 'AIzaSyAuIuAjS-p0SoRcKvVQm50TKEnJ6-QmoY8';
const COORDS_FILE = 'src/utils/neighborhoodCoords.json';

// Carregar o mapeamento para pegar todos os nomes
const mappingFile = fs.readFileSync('src/utils/manausMapping.js', 'utf8');
const neighborhoodRegex = /"([^"]+)":\s*"Zona/g;
const allNeighborhoods = [];
let match;
while ((match = neighborhoodRegex.exec(mappingFile)) !== null) {
  allNeighborhoods.push(match[1]);
}

// Carregar coordenadas existentes
let currentCoords = {};
if (fs.existsSync(COORDS_FILE)) {
  currentCoords = JSON.parse(fs.readFileSync(COORDS_FILE, 'utf8'));
}

async function geocodeNeighborhood(nb) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(`${nb}, Manaus, Amazonas, Brasil`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results.length > 0) {
            const { lat, lng } = json.results[0].geometry.location;
            resolve([lat, lng]);
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

async function updateAll() {
  console.log(`🚀 Iniciando atualização de ${allNeighborhoods.length} bairros...`);
  let addedCount = 0;

  for (const nb of allNeighborhoods) {
    if (currentCoords[nb]) {
      // console.log(`✓ ${nb} já existe.`);
      continue;
    }

    console.log(`🔍 Buscando coordenadas para: ${nb}...`);
    const coords = await geocodeNeighborhood(nb);
    
    if (coords) {
      currentCoords[nb] = coords;
      addedCount++;
      console.log(`✅ ${nb}: [${coords[0]}, ${coords[1]}]`);
      
      // Salvar a cada 5 para não perder progresso
      if (addedCount % 5 === 0) {
        fs.writeFileSync(COORDS_FILE, JSON.stringify(currentCoords, null, 2));
      }
    } else {
      console.log(`❌ ${nb}: Não encontrado.`);
    }

    // Pequeno delay para não estourar limite de taxa (rate limit) se necessário
    await new Promise(r => setTimeout(r, 100));
  }

  fs.writeFileSync(COORDS_FILE, JSON.stringify(currentCoords, null, 2));
  console.log(`\n✨ Concluído! Adicionados ${addedCount} novos bairros/sub-bairros.`);
}

updateAll();
