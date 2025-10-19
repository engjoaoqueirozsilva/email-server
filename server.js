const express = require('express');
const sgMail = require('@sendgrid/mail');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.set('trust proxy', 1);

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 10,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Product configuration mapping
const PRODUCTS = {
  mitolyn: {
    name: 'Mitolyn',
    ebookFilename: 'mitolyn-guide.pdf',
    offerUrl: 'https://mitolyn.com/welcome/?hop=jkqueiroz&hopId=912f3c24-304a-43f9-a90c-e904f4178b81'
  },
  prostavive: {
    name: 'ProstaVive',
    ebookFilename: 'prostavive-guide.pdf',
    offerUrl: 'https://prostavive.org/?hopId=b5e0f2b7-7d3d-4aaf-8a1e-07ae2643bf3c'
  },
  // Add more products here as needed
};

// Ensure directories exist
const ensureDirectories = async () => {
  const dirs = ['leads', 'ebooks', 'templates'];
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
};

// Save lead to product-specific CSV
const saveLead = async (productSlug, name, email) => {
  const leadsDir = path.join(__dirname, 'leads');
  const leadsFile = path.join(leadsDir, `${productSlug}-leads.csv`);
  const timestamp = new Date().toISOString();
  const csvLine = `"${timestamp}","${name}","${email}","${productSlug}"\n`;
  
  try {
    // Check if file exists, if not create with headers
    try {
      await fs.access(leadsFile);
    } catch {
      await fs.writeFile(leadsFile, '"Timestamp","Name","Email","Product"\n');
    }
    
    // Append lead
    await fs.appendFile(leadsFile, csvLine);
    console.log(`✓ Lead saved [${productSlug}]: ${email}`);
  } catch (error) {
    console.error(`Error saving lead [${productSlug}]:`, error);
    throw error;
  }
};

// Read product-specific email template
const getEmailTemplate = async (productSlug, name) => {
  const templatePath = path.join(__dirname, 'templates', productSlug, 'email.html');
  
  try {
    let template = await fs.readFile(templatePath, 'utf-8');
    
    const product = PRODUCTS[productSlug];
    
    // Replace placeholders
    template = template.replace(/{{NAME}}/g, name);
    template = template.replace(/{{PRODUCT_NAME}}/g, product.name);
    template = template.replace(/{{OFFER_URL}}/g, product.offerUrl);
    
    return template;
  } catch (error) {
    console.warn(`⚠️ Custom template not found for ${productSlug}, using default`);
    
    // Fallback to simple template
    const product = PRODUCTS[productSlug];
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6a1b9a;">Hi ${name}! 👋</h1>
          <p>Thank you for your interest in <strong>${product.name}</strong>!</p>
          <p>Your free guide is attached to this email.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${product.offerUrl}" style="background: #6a1b9a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              🔥 Claim Your Exclusive Offer →
            </a>
          </div>
          <p>To your success,<br><strong>The ${product.name} Team</strong></p>
        </div>
      </body>
      </html>
    `;
  }
};

// API endpoint to submit email
app.post('/api/submit-email', async (req, res) => {
  const { name, email, productSlug } = req.body;
  
  console.log(`📥 Request received [${productSlug}]:`, { name, email });
  
  // Validation
  if (!name || !email || !productSlug) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name, email, and productSlug are required' 
    });
  }
  
  // Check if product exists
  if (!PRODUCTS[productSlug]) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid product' 
    });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid email address' 
    });
  }
  
  try {
    const product = PRODUCTS[productSlug];
    
    // Save lead to CSV
    await saveLead(productSlug, name, email);
    
    // Read ebook file
    const ebookPath = path.join(__dirname, 'ebooks', product.ebookFilename);
    let ebookContent = null;
    
    try {
      ebookContent = await fs.readFile(ebookPath);
      console.log(`✓ Ebook loaded [${productSlug}]: ${product.ebookFilename}`);
    } catch (error) {
      console.warn(`⚠️ Ebook not found [${productSlug}]: ${product.ebookFilename}`);
    }
    
    // Get email template
    const htmlContent = await getEmailTemplate(productSlug, name);
    
    // Prepare email message
    const msg = {
      to: email,
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME || `${product.name} Team`
      },
      subject: `🎁 Your Free ${product.name} Guide is Here!`,
      html: htmlContent,
      text: `Hi ${name},\n\nThank you for your interest in ${product.name}! Your free guide is attached to this email.\n\nBest regards,\nThe ${product.name} Team`
    };
    
    // Add attachment if ebook exists
    if (ebookContent) {
      msg.attachments = [
        {
          content: ebookContent.toString('base64'),
          filename: `${product.name}-Guide.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ];
    }
    
    // Send email via SendGrid
    await sgMail.send(msg);
    
    console.log(`✓ Email sent successfully [${productSlug}] to: ${email}`);
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully!',
      product: product.name
    });
    
  } catch (error) {
    console.error(`Error processing request [${productSlug}]:`, error);
    
    // Check if it's a SendGrid error
    if (error.response) {
      console.error('SendGrid Error:', error.response.body);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process request. Please try again.' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    products: Object.keys(PRODUCTS),
    environment: process.env.NODE_ENV || 'development'
  });
});

// List available products (optional - for debugging)
app.get('/api/products', (req, res) => {
  const productList = Object.entries(PRODUCTS).map(([slug, config]) => ({
    slug,
    name: config.name
  }));
  
  res.json({
    success: true,
    products: productList
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
const startServer = async () => {
  await ensureDirectories();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(`🚀 Email API Service running on port ${PORT}`);
    console.log(`📧 From Email: ${process.env.FROM_EMAIL}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Available Products: ${Object.keys(PRODUCTS).join(', ')}`);
    console.log(`🔒 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
    console.log('='.repeat(60));
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

startServer().catch(console.error);