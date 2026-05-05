export const MANAUS_NEIGHBORHOODS_TO_ZONES = {
  // Zona Norte
  "Cidade de Deus": "Zona Norte",
  "Cidade Nova": "Zona Norte",
  "Colônia Santo Antônio": "Zona Norte",
  "Colônia Terra Nova": "Zona Norte",
  "Lago Azul": "Zona Norte",
  "Monte das Oliveiras": "Zona Norte",
  "Nova Cidade": "Zona Norte",
  "Novo Aleixo": "Zona Norte",
  "Novo Israel": "Zona Norte",
  "Santa Etelvina": "Zona Norte",
  "Canaranas": "Zona Norte",
  "Riacho Doce": "Zona Norte",
  "Francisca Mendes": "Zona Norte",

  // Zona Leste
  "Armando Mendes": "Zona Leste",
  "Colônia Antônio Aleixo": "Zona Leste",
  "Coroado": "Zona Leste",
  "Distrito Industrial II": "Zona Leste",
  "Gilberto Mestrinho": "Zona Leste",
  "Jorge Teixeira": "Zona Leste",
  "Mauazinho": "Zona Leste",
  "Puraquequara": "Zona Leste",
  "São José Operário": "Zona Leste",
  "Tancredo Neves": "Zona Leste",
  "Zumbi dos Palmares": "Zona Leste",
  "João Paulo": "Zona Leste",
  "Brasileirinho": "Zona Leste",

  // Zona Sul
  "Betânia": "Zona Sul",
  "Cachoeirinha": "Zona Sul",
  "Centro": "Zona Sul",
  "Crespo": "Zona Sul",
  "Distrito Industrial I": "Zona Sul",
  "Japiim": "Zona Sul",
  "Morro da Liberdade": "Zona Sul",
  "Nossa Senhora Aparecida": "Zona Sul",
  "Petrópolis": "Zona Sul",
  "Praça 14 de Janeiro": "Zona Sul",
  "Praça 14": "Zona Sul",
  "Presidente Vargas": "Zona Sul",
  "Raiz": "Zona Sul",
  "Santa Luzia": "Zona Sul",
  "São Francisco": "Zona Sul",
  "São Lázaro": "Zona Sul",
  "Vila Buriti": "Zona Sul",
  "Educandos": "Zona Sul",
  "Colônia Oliveira Machado": "Zona Sul",
  "Aparecida": "Zona Sul",

  // Zona Centro-Sul
  "Adrianópolis": "Zona Centro-Sul",
  "Aleixo": "Zona Centro-Sul",
  "Chapada": "Zona Centro-Sul",
  "Flores": "Zona Centro-Sul",
  "Nossa Senhora das Graças": "Zona Centro-Sul",
  "Parque 10 de Novembro": "Zona Centro-Sul",
  "Parque 10": "Zona Centro-Sul",
  "São Geraldo": "Zona Centro-Sul",
  "Vieiralves": "Zona Centro-Sul",

  // Zona Oeste
  "Compensa": "Zona Oeste",
  "Glória": "Zona Oeste",
  "Lírio do Vale": "Zona Oeste",
  "Nova Esperança": "Zona Oeste",
  "Ponta Negra": "Zona Oeste",
  "Santo Agostinho": "Zona Oeste",
  "Santo Antônio": "Zona Oeste",
  "São Jorge": "Zona Oeste",
  "Tarumã": "Zona Oeste",
  "Tarumã-Açu": "Zona Oeste",
  "Vila da Prata": "Zona Oeste",
  "São Raimundo": "Zona Oeste",

  // Zona Centro-Oeste
  "Alvorada": "Zona Centro-Oeste",
  "Bairro da Paz": "Zona Centro-Oeste",
  "Dom Pedro": "Zona Centro-Oeste",
  "Planalto": "Zona Centro-Oeste",
  "Redenção": "Zona Centro-Oeste"
};

export const getZoneByNeighborhood = (neighborhood) => {
  if (!neighborhood) return null;
  
  // Normalização para busca insensível a acentos e case
  const normalizedSearch = neighborhood.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const match = Object.keys(MANAUS_NEIGHBORHOODS_TO_ZONES).find(key => {
    const normalizedKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normalizedKey === normalizedSearch;
  });

  return match ? MANAUS_NEIGHBORHOODS_TO_ZONES[match] : null;
};
