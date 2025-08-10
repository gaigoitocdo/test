const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8080;

console.log('🏆 FINAL SOLUTION - Telegram Web + PHP Integration');

// ✨ Force use public folder (has latest profile features)
let staticFolder = 'public'; // Force use public instead of auto-detect

console.log('🎯 FORCED to use public/ folder (latest features)');
console.log('📁 Serving from: public/');

// Check if public has the files we need
const publicPath = path.join(__dirname, 'public');
const publicIndex = path.join(publicPath, 'index.html');

if (fs.existsSync(publicIndex)) {
  const jsFiles = fs.readdirSync(publicPath).filter(f => f.endsWith('.js'));
  const cssFiles = fs.readdirSync(publicPath).filter(f => f.endsWith('.css'));
  
  console.log(`✅ Public folder check:`);
  console.log(`   📄 JS files: ${jsFiles.length}`);
  console.log(`   🎨 CSS files: ${cssFiles.length}`);
  console.log(`   📋 Has index.html: ${fs.existsSync(publicIndex)}`);
  console.log(`   📂 Has telebook/: ${fs.existsSync(path.join(publicPath, 'telebook'))}`);
  console.log(`   🔗 Has js/: ${fs.existsSync(path.join(publicPath, 'js'))}`);
} else {
  console.error('❌ Public folder missing index.html!');
}

// ✨ Better caching and asset handling
app.use((req, res, next) => {
  // Disable cache for HTML files
  if (req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  } else if (req.path.match(/\.(js|css|wasm|woff|woff2)$/)) {
    // Enable cache for assets
    res.set('Cache-Control', 'public, max-age=86400'); // 1 day
  }
  next();
});

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  next();
});

// ✨ API Routes - Proxy to PHP (PRIORITY #1)
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8090',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/telebook/api'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('🔄 API:', req.method, req.originalUrl);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('✅ API Response:', proxyRes.statusCode, req.originalUrl);
  },
  onError: (err, req, res) => {
    console.error('❌ API Error:', err.message);
    res.status(503).json({
      success: false,
      error: 'PHP backend unavailable',
      message: 'Make sure PHP server is running on port 8090'
    });
  }
}));

// ✨ Telebook routes - Proxy to PHP
app.use('/telebook', createProxyMiddleware({
  target: 'http://localhost:8090',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log('🔄 Telebook:', req.method, req.originalUrl);
  }
}));

// ✨ Telegram API Bridge - Serve our custom JS
app.get('/js/telegram-api-bridge.js', (req, res) => {
  const bridgeCode = `
/**
 * 🔗 Telegram API Bridge - Embedded Version
 */
class TelegramAPI {
    constructor() {
        this.baseURL = '/api';
        this.debug = true;
        console.log('🔗 Telegram API Bridge initializing...');
        this.init();
    }

    async init() {
        try {
            const result = await this.testConnection();
            if (result.success) {
                console.log('✅ PHP Backend connected!');
                this.loadUserProfile();
            }
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
        }
    }

    async testConnection() {
        try {
            const response = await fetch(this.baseURL + '/test.php');
            const data = await response.json();
            console.log('🧪 Test API:', data);
            return data;
        } catch (error) {
            console.error('❌ Test failed:', error);
            throw error;
        }
    }

    async getUserInfo(userId = null) {
        try {
            const url = this.baseURL + '/user-info.php' + (userId ? '?user_id=' + userId : '');
            const response = await fetch(url);
            const data = await response.json();
            console.log('👤 User Info:', data);
            return data;
        } catch (error) {
            console.error('❌ Get user info failed:', error);
            throw error;
        }
    }

    async loadUserProfile() {
        try {
            const userData = await this.getUserInfo();
            if (userData.success) {
                this.updateUI(userData.user);
                console.log('✅ Profile updated');
            }
        } catch (error) {
            console.error('❌ Load profile failed:', error);
        }
    }

    updateUI(user) {
        // Update balance
        const balanceElements = document.querySelectorAll('.balance-amount, .user-balance');
        balanceElements.forEach(el => {
            if (el) el.textContent = this.formatVND(user.balance);
        });

        // Update user name
        const nameElements = document.querySelectorAll('.user-name, .profile-name');
        nameElements.forEach(el => {
            if (el) el.textContent = user.name;
        });

        // Update VIP status
        const vipElements = document.querySelectorAll('.vip-level, .vip-status');
        vipElements.forEach(el => {
            if (el) el.textContent = user.vip_level;
        });

        console.log('🎨 UI updated with real data');
    }

    formatVND(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    async refresh() {
        console.log('🔄 Refreshing data...');
        await this.loadUserProfile();
    }
}

// ✨ Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Starting Telegram API Bridge...');
    window.TelegramAPI = new TelegramAPI();
});

// ✨ Auto-refresh every 5 minutes
setInterval(() => {
    if (window.TelegramAPI) {
        window.TelegramAPI.refresh();
    }
}, 5 * 60 * 1000);

console.log('📦 Telegram API Bridge loaded');
  `;
  
  res.setHeader('Content-Type', 'application/javascript');
  res.send(bridgeCode);
});

// ✨ Serve detected static files with better handling
app.use(express.static(staticFolder, {
  maxAge: '1d', // Cache assets for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Special handling for specific file types
    if (path.endsWith('.wasm')) {
      res.set('Content-Type', 'application/wasm');
    } else if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// ✨ Handle assets subfolder specifically
app.use('/assets', express.static(path.join(staticFolder, 'assets'), {
  maxAge: '1d',
  etag: true
}));

// ✨ Main route - serve index.html with error handling
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, staticFolder, 'index.html');
  
  console.log(`📄 Serving index.html from: ${indexPath}`);
  
  if (fs.existsSync(indexPath)) {
    // Read and serve index.html with our API bridge injection
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Inject API bridge before closing body tag if not already present
    if (!indexContent.includes('telegram-api-bridge.js')) {
      indexContent = indexContent.replace(
        '</body>',
        '  <script src="/js/telegram-api-bridge.js"></script>\n</body>'
      );
      console.log('💉 Injected API bridge script');
    }
    
    res.set('Content-Type', 'text/html');
    res.send(indexContent);
  } else {
    console.error(`❌ Index.html not found at: ${indexPath}`);
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>❌ Files Not Found</title></head>
      <body>
        <h1>❌ Telegram Web files not found</h1>
        <p><strong>Searched in:</strong> ${staticFolder}/</p>
        <p><strong>Index path:</strong> ${indexPath}</p>
        <p><strong>File exists:</strong> ${fs.existsSync(indexPath)}</p>
        <hr>
        <h2>🔧 Quick Fix:</h2>
        <ol>
          <li>Make sure Telegram Web is built: <code>pnpm build</code></li>
          <li>Or copy built files to the correct location</li>
        </ol>
        <hr>
        <h2>📊 API Status:</h2>
        <ul>
          <li><a href="/api/test.php" target="_blank">Test API</a></li>
          <li><a href="/api/user-info.php" target="_blank">User Info API</a></li>
        </ul>
      </body>
      </html>
    `);
  }
});

// ✨ SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/telebook')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(__dirname, staticFolder, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.redirect('/');
  }
});

// ✨ SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/telebook')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log('🎉 TELEGRAM WEB + PHP INTEGRATION READY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 Frontend: http://localhost:8080');
  console.log('🔗 APIs: http://localhost:8080/api/*');
  console.log('📊 PHP Backend: http://localhost:8090');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🧪 Test Commands:');
  console.log('   curl http://localhost:8080/api/test.php');
  console.log('   curl http://localhost:8080/api/user-info.php');
  console.log('');
  console.log('💡 In browser console:');
  console.log('   window.TelegramAPI.testConnection()');
  console.log('   window.TelegramAPI.getUserInfo()');
  console.log('');
  console.log('🎯 Ready to use! Open http://localhost:8080');
});