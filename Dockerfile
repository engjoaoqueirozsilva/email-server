# Etapa 1: build
FROM node:20-alpine AS builder
WORKDIR /app

# Copia arquivos e instala dependências
COPY package*.json ./
RUN npm ci --only=production

# Copia o restante da aplicação
COPY . .

# Etapa 2: runtime (container leve)
FROM node:20-alpine
WORKDIR /app

# Copia os arquivos da etapa anterior
COPY --from=builder /app /app

# Define variáveis padrão (importantes para o Coolify)
ENV NODE_ENV=production
ENV PORT=8700

# Expõe a porta real do servidor (a mesma usada no app)
EXPOSE 8700

# Inicia o app
CMD ["node", "server.js"]
