const puppeteer = require('puppeteer');
const fs = require('fs');

const neighborhoods = [
  "Águas Claras", "Boas Novas", "Campo Dourado", "Carlos Braga", "Cidade de Deus",
  "Cidade Nova", "Colônia Santo Antônio", "Colônia Terra Nova", "Fazendinha",
  "Francisca Mendes", "Galileia", "Jesus Me Deu", "João Paulo", "Lago Azul",
  "Manoa", "Monte das Oliveiras", "Mundo Novo", "Mutirão", "Nossa Senhora de Fátima",
  "Nova Cidade", "Novo Aleixo", "Novo Israel", "Omar Aziz", "Oswaldo Frota",
  "Renato Souza Pinto", "Riacho Doce", "Ribeiro Júnior", "Santa Etelvina",
  "Viver Melhor", "Viver Melhor I", "Viver Melhor II", "Viver Melhor III", "Viver Melhor IV",
  "Acariquara", "Armando Mendes", "Bairro Novo", "Braga Mendes", "Castanheiras",
  "Cidade Leste", "Colônia Antônio Aleixo", "Coroado", "Distrito Industrial II",
  "Gilberto Mestrinho", "Grande Vitória", "João Bosco", "João Paulo II",
  "Jorge Teixeira", "Mauazinho", "Monte Sião", "Nova Floresta", "Nova Vitória",
  "Ouro Verde", "Puraquequara", "São José Operário", "Tancredo Neves",
  "Val Paraíso", "Zumbi dos Palmares",
  "Betânia", "Cachoeirinha", "Cajual", "Centro", "Colônia Oliveira Machado",
  "Crespo", "Distrito Industrial I", "Educandos", "Japiim", "Japiinlândia",
  "Manaus 2000", "Matinha", "Morro da Liberdade", "Nossa Senhora de Aparecida",
  "Panair", "Petrópolis", "Praça 14 de Janeiro", "Presidente Vargas", "Raiz",
  "Santa Luzia", "São Benedito", "São Francisco", "São Lázaro", "Vila Buriti",
  "Adrianópolis", "Aleixo", "Bairro da União", "Beija-Flor", "Chapada",
  "Conjunto Castelo Branco", "Conjunto Tocantins", "Eldorado", "Flores",
  "Morada do Sol", "Nossa Senhora das Graças", "Parque 10 de Novembro",
  "Parque 10", "Parque das Laranjeiras", "São Geraldo", "Shangrillá",
  "Tiradentes", "Vieiralves",
  "Campos Sales", "Compensa", "Conjunto Cophasa", "Glória", "Lírio do Vale",
  "Marina do Davi", "Nova Esperança", "Parque das Tribos", "Parque Riachuelo",
  "Parque São Pedro", "Ponta Negra", "Santo Agostinho", "Santo Antônio",
  "São Jorge", "São Raimundo", "Tarumã", "Tarumã-Açu", "Vila da Prata",
  "Vila Marinho", "Vivenda do Pontal",
  "Ajuricaba", "Alvorada", "Alvorada I", "Alvorada II", "Alvorada III",
  "Bairro da Paz", "Belvedere", "Campos Elíseos", "Da Paz", "Dom Pedro",
  "Dom Pedro I", "Dom Pedro II", "Eduardo Gomes", "Hiléia", "Kíssia",
  "Planalto", "Promorar", "Redenção", "Santos Dumont", "Tropical"
];

// Preservar as exceções que já sabemos que estão perfeitamente ajustadas pelo usuário
const exceptions = {
  "Mundo Novo": [-3.0381, -59.9936],
  "Riacho Doce": [-3.0246, -59.9716]
};

async function scrapeGoogleMaps() {
  console.log('🚀 Iniciando scraping no Google Maps...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const results = { ...exceptions };
  
  for (const nb of neighborhoods) {
    if (exceptions[nb]) {
      console.log(`✓ ${nb} (Mantido manualmente)`);
      continue;
    }

    try {
      const query = encodeURIComponent(`Bairro ${nb}, Manaus, Amazonas`);
      const url = `https://www.google.com/maps/search/${query}`;
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      // Esperar a URL mudar para conter as coordenadas do local procurado
      await page.waitForFunction('window.location.href.includes("@")', { timeout: 5000 }).catch(() => {});
      
      const finalUrl = page.url();
      const match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      
      if (match) {
        results[nb] = [parseFloat(match[1]), parseFloat(match[2])];
        console.log(`✓ ${nb}: [${match[1]}, ${match[2]}]`);
      } else {
        console.log(`✗ ${nb}: Não encontrou coordenadas na URL`);
      }
    } catch (e) {
      console.log(`✗ ${nb}: Erro - ${e.message}`);
    }
    
    // Atualizar o arquivo a cada iteração para não perder os dados
    fs.writeFileSync('src/utils/neighborhoodCoords.json', JSON.stringify(results, null, 2));
  }

  await browser.close();
  console.log('✅ Extração concluída com sucesso!');
}

scrapeGoogleMaps();
