# Etapa de build
FROM node:20-alpine AS builder
WORKDIR /app

# ----------------------------------------------------------------------
# CORREÇÃO: Combina instalação de ferramentas de build, npm ci e limpeza
#
# build-base: Contém g++, make e outras ferramentas de compilação
# python3: Necessário para o 'node-gyp' em muitas dependências nativas
# ----------------------------------------------------------------------
COPY package*.json ./

RUN apk add --no-cache build-base python3 \
    && npm ci --only=production \
    # Remove as dependências de build para manter o estágio 'builder' pequeno
    && apk del build-base python3

# Copia código
COPY . .

# ----------------------------------------------------------------------
# Etapa final (runtime) - Permanece a mesma, sem ferramentas de build
# ----------------------------------------------------------------------
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