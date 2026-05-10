# Estágio de Build
FROM node:22-slim AS build

# Definir argumentos de build para as variáveis de ambiente do Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_EVOLUTION_API_URL
ARG VITE_EVOLUTION_API_KEY
ARG VITE_APP_URL

# Tornar os argumentos disponíveis como variáveis de ambiente durante o build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_EVOLUTION_API_URL=$VITE_EVOLUTION_API_URL
ENV VITE_EVOLUTION_API_KEY=$VITE_EVOLUTION_API_KEY
ENV VITE_APP_URL=$VITE_APP_URL

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (limpo)
RUN npm install

# Copiar o restante do código
COPY . .

# Gerar o build de produção
RUN npm run build

# Estágio de Produção (Servidor Web Leve)
FROM nginx:alpine

# Copiar os arquivos gerados no build para o diretório do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração personalizada do Nginx para suportar rotas (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
