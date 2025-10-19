# 🚀 Email API Service - Multi-Product Lead Capture

Sistema centralizado de captura de emails com envio automático de ebooks via SendGrid. Suporta múltiplos produtos com templates personalizados.

---

## 📁 Estrutura do Projeto

```
/email-api-service
├── Dockerfile                  # Container configuration
├── docker-compose.yml          # Docker Compose setup
├── server.js                   # Main API server
├── package.json                # Dependencies
├── .env                        # Environment variables (CREATE THIS!)
├── .env.example                # Example configuration
├── .gitignore                  # Git ignore rules
├── .dockerignore               # Docker ignore rules
├── README.md                   # This file
├── /templates                  # Email templates by product
│   ├── /mitolyn
│   │   └── email.html
│   ├── /prostavive
│   │   └── email.html
│   └── /produto3
│       └── email.html
├── /ebooks                     # PDF files to send
│   ├── mitolyn-guide.pdf
│   ├── prostavive-guide.pdf
│   └── produto3-guide.pdf
└── /leads                      # CSV files (auto-generated)
    ├── mitolyn-leads.csv
    ├── prostavive-leads.csv
    └── produto3-leads.csv
```

---

## ⚡ Quick Start

### 1️⃣ Clone e Configure

```bash
git clone <your-repo>
cd email-api-service

# Create .env file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 2️⃣ Configurar SendGrid

1. Crie conta: https://signup.sendgrid.com/
2. Gere API Key: Settings → API Keys → Create API Key
3. Nome: `Email-API-Production`
4. Permissões: **Full Access**
5. Copie a chave (só aparece uma vez!)

6. Verifique email remetente: Settings → Sender Authentication → Verify a Single Sender

### 3️⃣ Adicionar Ebooks

```bash
# Coloque os PDFs na pasta /ebooks
cp seu-ebook.pdf ebooks/mitolyn-guide.pdf
cp outro-ebook.pdf ebooks/prostavive-guide.pdf
```

### 4️⃣ Rodar Localmente

**Com Docker:**
```bash
docker-compose up -d
```

**Sem Docker:**
```bash
npm install
npm start
```

Acesse: http://localhost:3000/health

---

## 🐳 Deploy no Coolify

### Método 1: Docker Compose (Recomendado)

1. **No Coolify, criar novo serviço:**
   - Type: `Docker Compose`
   - Repository: Seu repo Git
   - Branch: `main`

2. **Configurar Environment Variables:**

```env
SENDGRID_API_KEY=SG.sua_chave_aqui
FROM_EMAIL=seuemail@gmail.com
FROM_NAME=Email API Service
CORS_ORIGIN=https://mitolyn.seudominio.com,https://prostavive.seudominio.com
PORT=3000
NODE_ENV=production
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=10
```

3. **Configurar Domain:**
   - Domain: `api-email.seudominio.com`
   - Traefik configurará SSL automaticamente

4. **Deploy:**
```bash
git push origin main
```

Coolify detectará e fará deploy automaticamente!

### Método 2: Dockerfile

Se preferir usar apenas Dockerfile:

1. No Coolify: `New Resource` → `Dockerfile`
2. Build Command: `docker build -t email-api .`
3. Port: `3000`
4. Resto igual ao Método 1

---

## 📊 API Endpoints

### `POST /api/submit-email`

Captura email e envia ebook.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "productSlug": "mitolyn"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Email sent successfully!",
  "product": "Mitolyn"
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "Invalid email address"
}
```

---

### `GET /health`

Health check do serviço.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-19T19:30:00.000Z",
  "products": ["mitolyn", "prostavive"],
  "environment": "production"
}
```

---

### `GET /api/products`

Lista produtos disponíveis.

**Response:**
```json
{
  "success": true,
  "products": [
    { "slug": "mitolyn", "name": "Mitolyn" },
    { "slug": "prostavive", "name": "ProstaVive" }
  ]
}
```

---

## 🎨 Adicionar Novo Produto

### 1. Atualizar `server.js`

Adicione no objeto `PRODUCTS`:

```javascript
const PRODUCTS = {
  mitolyn: {
    name: 'Mitolyn',
    ebookFilename: 'mitolyn-guide.pdf',
    offerUrl: 'https://mitolyn.com/...'
  },
  // ✅ ADICIONE AQUI
  seuproduto: {
    name: 'Seu Produto',
    ebookFilename: 'seuproduto-guide.pdf',
    offerUrl: 'https://seuproduto.com/...'
  }
};
```

### 2. Criar Template de Email

```bash
mkdir -p templates/seuproduto
cp templates/mitolyn/email.html templates/seuproduto/email.html

# Edite o template com as cores/textos do produto
nano templates/seuproduto/email.html
```

### 3. Adicionar Ebook

```bash
cp seu-ebook.pdf ebooks/seuproduto-guide.pdf
```

### 4. Deploy

```bash
git add .
git commit -m "Add new product: seuproduto"
git push origin main
```

Pronto! 🎉

---

## 🔧 Configuração CORS

Por padrão, aceita requisições de qualquer origem (`*`).

Para restringir a origens específicas:

```env
# .env
CORS_ORIGIN=https://mitolyn.seudominio.com,https://prostavive.seudominio.com
```

Ou no código (`server.js`):

```javascript
const corsOptions = {
  origin: ['https://mitolyn.com', 'https://prostavive.com'],
  methods: ['POST', 'GET', 'OPTIONS']
};
```

---

## 📈 Monitoramento

### Ver Leads Capturados

```bash
# Acessar container
docker exec -it email-api-service sh

# Ver leads por produto
cat leads/mitolyn-leads.csv
cat leads/prostavive-leads.csv
```

### Baixar CSV

```bash
# Via SCP
scp user@server:/app/email-api-service/leads/*.csv ./

# Ou via Coolify: File Manager → Download
```

### Logs em Tempo Real

```bash
# Docker Compose
docker-compose logs -f

# Coolify Dashboard
Clique no serviço → Logs
```

---

## 🐛 Troubleshooting

### ❌ Erro 401: Unauthorized

**Causa:** API Key do SendGrid inválida.

**Solução:**
1. Regere API Key no SendGrid
2. Atualize `.env` ou variáveis no Coolify
3. Reinicie container: `docker-compose restart`

---

### ❌ Erro: "Ebook not found"

**Causa:** PDF não existe na pasta `/ebooks`.

**Solução:**
```bash
# Verificar se arquivo existe
ls -la ebooks/

# Adicionar PDF
cp seu-ebook.pdf ebooks/mitolyn-guide.pdf

# Restart
docker-compose restart
```

---

### ❌ CORS Error no Frontend

**Causa:** Origem não permitida.

**Solução:**
Adicione o domínio em `CORS_ORIGIN`:
```env
CORS_ORIGIN=https://mitolyn.seudominio.com,https://novo-dominio.com
```

---

### ❌ Rate Limit Error

**Causa:** Muitas requisições em pouco tempo.

**Solução:**
Ajuste os limites no `.env`:
```env
RATE_LIMIT_WINDOW=30    # 30 minutos
RATE_LIMIT_MAX=20       # 20 requests
```

---

## 🧪 Testes

### Teste Manual via cURL

```bash
curl -X POST http://localhost:3000/api/submit-email \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "productSlug": "mitolyn"
  }'
```

### Teste de Produção

```bash
curl -X POST https://api-email.seudominio.com/api/submit-email \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "seuemail@gmail.com",
    "productSlug": "mitolyn"
  }'
```

---

## 🔒 Segurança

### Implementações Atuais:

✅ **Helmet.js** - Headers de segurança
✅ **CORS** - Controle de origem
✅ **Rate Limiting** - 10 requests/15min por IP
✅ **Input Validation** - Email regex + sanitização
✅ **Trust Proxy** - Suporte a proxy reverso (Traefik)

### Recomendações Extras:

**1. Adicionar reCAPTCHA:**
```bash
npm install express-recaptcha
```

**2. Webhook de notificação:**
Receba notificação no Discord/Slack quando capturar lead.

**3. Backup automático dos CSVs:**
Configure backup diário no Coolify.

---

## 📊 Estatísticas SendGrid

Acesse: https://app.sendgrid.com/statistics

Você verá:
- Emails enviados
- Taxa de entrega
- Aberturas (configure tracking)
- Cliques nos CTAs

---

## 🎯 Próximos Passos

- [ ] Configure SendGrid
- [ ] Adicione ebooks na pasta `/ebooks`
- [ ] Customize templates em `/templates`
- [ ] Configure variáveis de ambiente
- [ ] Faça deploy no Coolify
- [ ] Teste com `curl`
- [ ] Atualize landing pages para usar a API

---

## 📞 Suporte

**Problemas com SendGrid:**
- Docs: https://docs.sendgrid.com/
- Support: https://support.sendgrid.com/

**Problemas com Docker:**
- Docs: https://docs.docker.com/

**Problemas com Coolify:**
- Docs: https://coolify.io/docs
- Discord: https://discord.gg/coolify

---

## 📝 License

MIT

---

## 🎉 Pronto para Black Friday!

Seu sistema de captura está pronto! Agora é só adicionar os ebooks e fazer deploy! 🚀💰