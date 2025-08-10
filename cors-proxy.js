// cors-proxy.js - Production ready for tme-tlegram.link
// File: cors-proxy.js

const http = require('http');
const httpProxy = require('http-proxy');
const url = require('url');

// Configuration
const PORT = process.env.PORT || 8091;
const TARGET_HOST = process.env.TARGET_HOST || 'localhost';
const TARGET_PORT = process.env.TARGET_PORT || 8090;
const PRODUCTION_DOMAIN = 'https://tme-tlegram.link';

console.log('🚀 Starting CORS Proxy for tme-tlegram.link...');

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://tme-tlegram.link',
    'https://web.telegram.org',
    'https://k.web.telegram.org', 
    'https://z.web.telegram.org',
    'https://a.web.telegram.org',
    // Local development
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
];

// Create proxy server
const proxy = httpProxy.createProxyServer({
    target: `http://${TARGET_HOST}:${TARGET_PORT}`,
    changeOrigin: true,
    secure: false,
    timeout: 60000,
    proxyTimeout: 60000,
    followRedirects: true,
    agent: new http.Agent({
        keepAlive: true,
        keepAliveMsecs: 60000,
        maxSockets: 100,
        timeout: 60000
    })
});

// Enhanced error handling
proxy.on('error', (err, req, res) => {
    console.error(`❌ ${new Date().toISOString()} - Proxy error:`, err.message);
    console.error(`   Request: ${req.method} ${req.url}`);
    console.error(`   Target: http://${TARGET_HOST}:${TARGET_PORT}`);
    
    if (!res.headersSent) {
        // Set CORS headers even for error responses
        const origin = req.headers.origin;
        if (ALLOWED_ORIGINS.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        
        res.writeHead(502, {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Frame-Options': 'ALLOWALL'
        });
        
        res.end(JSON.stringify({
            success: false,
            error: 'Proxy Error',
            message: 'Cannot connect to backend server',
            details: {
                target: `${TARGET_HOST}:${TARGET_PORT}`,
                error: err.message,
                timestamp: new Date().toISOString()
            },
            suggestion: 'Please ensure your PHP server is running on the correct port'
        }, null, 2));
    }
});

// Proxy response handling
proxy.on('proxyRes', (proxyRes, req, res) => {
    const origin = req.headers.origin;
    
    // Add CORS headers to all responses
    if (ALLOWED_ORIGINS.includes(origin)) {
        proxyRes.headers['Access-Control-Allow-Origin'] = origin;
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    }
    
    // Security headers for Telegram iframe
    proxyRes.headers['X-Frame-Options'] = 'ALLOWALL';
    proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
    
    // Log successful proxying
    if (req.url !== '/health' && req.url !== '/favicon.ico') {
        console.log(`✅ ${new Date().toISOString()} - ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
    }
});

// Main server
const server = http.createServer((req, res) => {
    const requestUrl = url.parse(req.url, true);
    const origin = req.headers.origin || req.headers.referer || '';
    const userAgent = req.headers['user-agent'] || '';
    const isFromTelegram = origin.includes('telegram.org') || userAgent.includes('Telegram');
    
    // Enhanced logging
    if (req.url !== '/health' && req.url !== '/favicon.ico') {
        console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
        console.log(`   Origin: ${origin}`);
        console.log(`   User-Agent: ${userAgent.substring(0, 100)}...`);
        console.log(`   From Telegram: ${isFromTelegram ? '✅' : '❌'}`);
    }

    // Comprehensive CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': [
            'Content-Type',
            'Authorization', 
            'X-Requested-With',
            'X-Telegram-Token',
            'X-Telegram-User-ID',
            'Accept',
            'Accept-Language',
            'Cache-Control'
        ].join(', '),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        
        // Security headers for iframe embedding
        'X-Frame-Options': 'ALLOWALL',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        
        // Content Security Policy for Telegram Web App
        'Content-Security-Policy': [
            "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
            "script-src * 'unsafe-inline' 'unsafe-eval' https://telegram.org https://web.telegram.org",
            "style-src * 'unsafe-inline'",
            "img-src * data: blob: https:",
            "font-src * data:",
            "connect-src * wss: ws: https://tme-tlegram.link",
            "frame-ancestors https://web.telegram.org https://k.web.telegram.org https://z.web.telegram.org https://a.web.telegram.org",
            "form-action 'self' https://tme-tlegram.link"
        ].join('; '),
        
        // Additional headers for better compatibility
        'X-Telegram-Compatible': 'true',
        'X-Powered-By': 'Telebook-Proxy/2.0',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    // Set origin-specific CORS
    if (ALLOWED_ORIGINS.includes(origin)) {
        corsHeaders['Access-Control-Allow-Origin'] = origin;
    } else if (isFromTelegram) {
        // Allow Telegram origins even if not in the list
        corsHeaders['Access-Control-Allow-Origin'] = origin;
        console.log(`🔓 Allowing Telegram origin: ${origin}`);
    } else if (!origin) {
        // For direct access (no origin header)
        corsHeaders['Access-Control-Allow-Origin'] = '*';
    }

    // Apply all CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        console.log(`🔄 ${new Date().toISOString()} - Preflight request from: ${origin}`);
        res.writeHead(204); // No Content
        res.end();
        return;
    }

    // Health check endpoint
    if (requestUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            status: 'healthy',
            proxy: 'running',
            target: `${TARGET_HOST}:${TARGET_PORT}`,
            domain: PRODUCTION_DOMAIN,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '2.0.0'
        }, null, 2));
        return;
    }

    // Proxy info endpoint
    if (requestUrl.pathname === '/proxy-info') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            proxy: {
                listening_port: PORT,
                target_host: TARGET_HOST,
                target_port: TARGET_PORT,
                production_domain: PRODUCTION_DOMAIN,
                allowed_origins: ALLOWED_ORIGINS,
                is_from_telegram: isFromTelegram,
                request_origin: origin
            },
            telegram_urls: {
                home: `${PRODUCTION_DOMAIN}/telebook/home?telegram=1&iframe=1`,
                booking: `${PRODUCTION_DOMAIN}/telebook/booking?telegram=1&iframe=1`,
                review: `${PRODUCTION_DOMAIN}/telebook/review?telegram=1&iframe=1`,
                support: `${PRODUCTION_DOMAIN}/telebook/support?telegram=1&iframe=1`
            }
        }, null, 2));
        return;
    }

    // Add special handling for Telegram Web App requests
    if (req.url.includes('telegram=1') || req.url.includes('iframe=1') || isFromTelegram) {
        // Add Telegram-specific headers
        res.setHeader('X-Telegram-Request', 'true');
        res.setHeader('X-Frame-Ancestors', 'https://web.telegram.org');
    }

    // Modify request headers before proxying
    req.headers['x-forwarded-host'] = 'tme-tlegram.link';
    req.headers['x-forwarded-proto'] = 'https';
    req.headers['x-forwarded-for'] = req.connection.remoteAddress;
    req.headers['x-real-ip'] = req.connection.remoteAddress;

    // Proxy the request
    proxy.web(req, res, {
        target: `http://${TARGET_HOST}:${TARGET_PORT}`,
        changeOrigin: true
    });
});

// Server startup
server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('='.repeat(70));
    console.log('🌐 TELEBOOK CORS PROXY SERVER - PRODUCTION READY');
    console.log('='.repeat(70));
    console.log(`📍 Proxy Server: http://0.0.0.0:${PORT}`);
    console.log(`🎯 Target Server: http://${TARGET_HOST}:${TARGET_PORT}`);
    console.log(`🌍 Production Domain: ${PRODUCTION_DOMAIN}`);
    console.log('');
    console.log('🔗 Available Endpoints:');
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   Proxy Info: http://localhost:${PORT}/proxy-info`);
    console.log('');
    console.log('📱 Telegram Web App URLs:');
    console.log(`   Home: ${PRODUCTION_DOMAIN}/telebook/home?telegram=1&iframe=1`);
    console.log(`   Booking: ${PRODUCTION_DOMAIN}/telebook/booking?telegram=1&iframe=1`);
    console.log(`   Review: ${PRODUCTION_DOMAIN}/telebook/review?telegram=1&iframe=1`);
    console.log(`   Support: ${PRODUCTION_DOMAIN}/telebook/support?telegram=1&iframe=1`);
    console.log('');
    console.log('🔒 Allowed Origins:');
    ALLOWED_ORIGINS.forEach(origin => {
        console.log(`   ✅ ${origin}`);
    });
    console.log('');
    console.log('📊 Status: READY - Waiting for requests...');
    console.log('🛑 To stop: Press Ctrl+C');
    console.log('='.repeat(70));
    console.log('');
});

// Enhanced error handling for server
server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
        console.error(`You can set a different port using: PORT=8092 node cors-proxy.js`);
    }
    process.exit(1);
});

// Graceful shutdown
const shutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    
    server.close((err) => {
        if (err) {
            console.error('❌ Error during server shutdown:', err.message);
            process.exit(1);
        }
        
        console.log('✅ Server closed successfully');
        console.log('👋 Goodbye!');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.log('⚠️  Force shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err.message);
    console.error(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Export for testing
module.exports = { server, proxy, ALLOWED_ORIGINS, PORT };