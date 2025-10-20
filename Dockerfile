# Etapa de build
FROM node:20-alpine AS builder
WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci --only=production

# Copia código
COPY . .

# Etapa final (runtime)
FROM node:20-alpine
WORKDIR /app

# Copia app construído
COPY --from=builder /app /app

# Define variáveis padrão
ENV NODE_ENV=production
ENV PORT=3000

# Expõe a porta interna usada pelo Coolify e pelo Traefik
EXPOSE 3000

# Inicializa o app
CMD ["node", "server.js"]