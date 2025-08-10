const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8080;

console.log('🚀 Starting simple Telegram Web server...');

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  next();
});

// ✨ API Routes - Proxy to PHP
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8090',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/telebook/api'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('🔄 API Proxy:', req.method, req.originalUrl);
  },
  onError: (err, req, res) => {
    console.error('❌ API Proxy Error:', err.message);
    res.status(503).json({
      success: false,
      error: 'PHP backend not available'
    });
  }
}));

// ✨ Telebook routes
app.use('/telebook', createProxyMiddleware({
  target: 'http://localhost:8090',
  changeOrigin: true
}));

// ✨ Static files from public directory
app.use(express.static('public'));

// ✨ API Bridge JavaScript
app.get('/js/telegram-api-bridge.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/js/telegram-api-bridge.js'));
});

// ✨ Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ✨ Catch-all for SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/telebook')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log('📁 Serving static files from: public/');
  console.log('🔗 API proxy: /api/* → http://localhost:8090/telebook/api/*');
  console.log('');
  console.log('🧪 Test APIs:');
  console.log(`   http://localhost:${PORT}/api/test.php`);
  console.log(`   http://localhost:${PORT}/api/user-info.php`);
  console.log('');
  console.log('🌐 Access app: http://localhost:8080');
});