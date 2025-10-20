# Etapa de build
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Copia arquivos de dependência
COPY package*.json ./

# 2. Instala Ferramentas de Build NECESSÁRIAS
# Usamos o `build-base` e adicionamos python3. 
# Adicionamos a ferramenta `git` também, que as vezes é necessária.
RUN apk add --no-cache build-base python3 git

# 3. Executa o NPM CI (Passo que está falhando)
# Este é agora um passo isolado. O erro acontecerá aqui.
RUN npm ci --only=production

# 4. Remove as Ferramentas de Build e limpa o cache
# Esta etapa só será alcançada se o 'npm ci' for bem-sucedido.
RUN apk del build-base python3 git \
    && rm -rf /var/cache/apk/*

# Copia código
COPY . .
# ... restante do Dockerfile (Etapa final)

# Define variáveis padrão
ENV NODE_ENV=production
ENV PORT=3000

# Expõe a porta interna usada pelo Coolify e pelo Traefik
EXPOSE 3000

# Inicializa o app
CMD ["node", "server.js"]