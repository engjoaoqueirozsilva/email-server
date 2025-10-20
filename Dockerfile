# Etapa de build
FROM node:20-alpine AS builder
WORKDIR /app

# ----------------------------------------------------------------------
# CORREÇÃO 1: Instala dependências de build para pacotes que precisam de compilação
# ----------------------------------------------------------------------
# Instala as ferramentas essenciais (build-base, python3) necessárias para compilar dependências nativas
RUN apk add --no-cache python3 make g++ 

# Instala dependências
COPY package*.json ./
# ----------------------------------------------------------------------
# Se a instalação falhar por causa de dependências nativas, esta correção
# resolve o problema de "gyp ERR! find Python" ou similar
# ----------------------------------------------------------------------
RUN npm ci --only=production

# ----------------------------------------------------------------------
# CORREÇÃO 2: Remove as dependências de build após a instalação do npm
#             para não contaminar a próxima etapa do build.
# ----------------------------------------------------------------------
RUN apk del python3 make g++

# Copia código
COPY . .

# ----------------------------------------------------------------------
# Etapa final (runtime) - Mantenha este estágio o mais enxuto possível
# ----------------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app

# Copia app construído
# A pasta node_modules foi instalada com sucesso na etapa 'builder' e será copiada
COPY --from=builder /app /app

# Define variáveis padrão
ENV NODE_ENV=production
ENV PORT=3000

# Expõe a porta interna usada pelo Coolify e pelo Traefik
EXPOSE 3000

# Inicializa o app
CMD ["node", "server.js"]