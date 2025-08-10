<?php
// public/telebook-router.php - Enhanced router for Telegram integration

// Enable error reporting for development
if (get_config('debug_mode', false)) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

// Include necessary files
include_once __DIR__ . '/telebook/config/config.php';
include_once __DIR__ . '/telebook/telegram-bridge-enhanced.php';
include_once __DIR__ . '/telebook/telegram_sync.php';

// Initialize Telegram bridge
telegram_bridge_init();

// Get request info
$request_uri = $_SERVER['REQUEST_URI'] ?? '/';
$request_method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$query_string = $_SERVER['QUERY_STRING'] ?? '';

// Parse the URL
$url_path = parse_url($request_uri, PHP_URL_PATH);
$url_path = str_replace('/telebook', '', $url_path);
$url_path = trim($url_path, '/');

// Add iframe and telegram parameters if not present
if (is_telegram_iframe() && !isset($_GET['iframe'])) {
    $_GET['iframe'] = '1';
    $_GET['telegram'] = '1';
}

telegram_debug([
    'request_uri' => $request_uri,
    'url_path' => $url_path,
    'method' => $request_method,
    'is_telegram' => is_telegram_iframe(),
    'user_authenticated' => telegram_is_authenticated()
], 'ROUTER');

// Route definitions
$routes = [
    // API routes
    'api/test' => 'api/test.php',
    'api/telegram-auth' => 'api/telegram-auth.php',
    'api/user-info' => 'api/user-info.php',
    'api/update-balance' => 'api/update-balance.php',
    'api/update-vip' => 'api/update-vip.php',
    'api/validate-token' => 'api/validate-token.php',

    // Admin routes
    'admin' => 'admin/index.php',
    'admin/login' => 'admin/login.php',
    'admin/users' => 'admin/users.php',
    'admin/topup' => 'admin/topup.php',
    'admin/withdraw' => 'admin/withdraw.php',
    'admin/config' => 'admin/config.php',

    // User routes
    'profile' => 'views/profile.php',
    'booking' => 'views/booking.php',
    'support' => 'views/support.php',
    'wallet' => 'views/wallet.php',
    'topup' => 'views/topup.php',
    'withdraw' => 'views/withdraw.php',
    'history' => 'views/history.php',
    'vip' => 'views/vip.php',

    // Auth routes
    'login' => 'views/login.php',
    'register' => 'views/register.php',
    'logout' => 'controllers/logout.php',

    // Special routes
    'setup' => 'setup.php',
    'migrate' => 'migrate.php',
    'test-integration' => 'test-integration.php'
];

// Default route
if (empty($url_path) || $url_path === '/') {
    $url_path = 'index';
    $routes['index'] = 'index.php';
}

// Handle API routes with CORS
if (strpos($url_path, 'api/') === 0) {
    set_telegram_cors_headers();

    if ($request_method === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// Route matching
$route_file = null;
$route_params = [];

// Exact match first
if (isset($routes[$url_path])) {
    $route_file = $routes[$url_path];
} else {
    // Pattern matching for dynamic routes
    foreach ($routes as $pattern => $file) {
        if (preg_match('#^' . str_replace('*', '(.*)', $pattern) . '$#', $url_path, $matches)) {
            $route_file = $file;
            $route_params = array_slice($matches, 1);
            break;
        }
    }
}

// If no route found, try direct file access
if (!$route_file) {
    $possible_files = [
        $url_path . '.php',
        $url_path . '/index.php',
        'views/' . $url_path . '.php',
        'controllers/' . $url_path . '.php'
    ];

    foreach ($possible_files as $file) {
        $full_path = __DIR__ . '/telebook/' . $file;
        if (file_exists($full_path)) {
            $route_file = $file;
            break;
        }
    }
}

// 404 handler
if (!$route_file) {
    handle_404($url_path);
    exit();
}

// Security checks
if (!is_route_allowed($url_path, $route_file)) {
    handle_403($url_path);
    exit();
}

// Include the route file
$full_route_path = __DIR__ . '/telebook/' . $route_file;

if (!file_exists($full_route_path)) {
    handle_404($url_path);
    exit();
}

// Set route params as global
$GLOBALS['route_params'] = $route_params;
$GLOBALS['current_route'] = $url_path;

// Execute the route
try {
    // Start output buffering for better error handling
    ob_start();

    // Include the route file
    include $full_route_path;

    // Flush output
    ob_end_flush();
} catch (Exception $e) {
    ob_end_clean();
    handle_error($e, $url_path);
}

/**
 * Security check for routes
 */
function is_route_allowed($route, $file)
{
    // Admin routes require admin access
    if (strpos($route, 'admin/') === 0) {
        return is_login() && is_admin();
    }

    // Some user routes require authentication
    $protected_routes = ['profile', 'wallet', 'booking', 'withdraw', 'history'];
    if (in_array($route, $protected_routes)) {
        return telegram_is_authenticated() || is_login();
    }

    // API routes have their own security
    if (strpos($route, 'api/') === 0) {
        return true; // Let API endpoints handle their own auth
    }

    // Block direct access to sensitive files
    $blocked_patterns = [
        '/config/',
        '/includes/',
        '/models/',
        '/.env',
        '/database.php'
    ];

    foreach ($blocked_patterns as $pattern) {
        if (strpos($file, $pattern) !== false) {
            return false;
        }
    }

    return true;
}

/**
 * 404 handler
 */
function handle_404($route)
{
    http_response_code(404);

    if (is_telegram_iframe()) {
        telegram_header('Page Not Found');
        echo '<div style="text-align: center; padding: 50px;">';
        echo '<h2>🔍 Page Not Found</h2>';
        echo '<p>The page <code>' . htmlspecialchars($route) . '</code> could not be found.</p>';
        echo '<button onclick="window.history.back()" class="telegram-btn telegram-btn-primary">Go Back</button>';
        echo '</div>';
        telegram_footer();
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Page not found',
            'route' => $route,
            'available_routes' => array_keys($GLOBALS['routes'] ?? [])
        ]);
    }
}

/**
 * 403 handler
 */
function handle_403($route)
{
    http_response_code(403);

    if (is_telegram_iframe()) {
        telegram_header('Access Denied');
        echo '<div style="text-align: center; padding: 50px;">';
        echo '<h2>🔒 Access Denied</h2>';
        echo '<p>You do not have permission to access this page.</p>';
        if (!telegram_is_authenticated()) {
            echo '<p><a href="/telebook/login" class="telegram-btn telegram-btn-primary">Login</a></p>';
        }
        echo '</div>';
        telegram_footer();
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Access denied',
            'route' => $route,
            'authenticated' => telegram_is_authenticated(),
            'is_admin' => is_admin()
        ]);
    }
}

/**
 * Error handler
 */
function handle_error($exception, $route)
{
    http_response_code(500);

    telegram_debug([
        'error' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'route' => $route
    ], 'ERROR');

    if (is_telegram_iframe()) {
        telegram_header('Error');
        echo '<div style="text-align: center; padding: 50px;">';
        echo '<h2>⚠️ An Error Occurred</h2>';
        echo '<p>Something went wrong while processing your request.</p>';

        if (get_config('debug_mode', false)) {
            echo '<div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: left;">';
            echo '<strong>Debug Info:</strong><br>';
            echo 'Error: ' . htmlspecialchars($exception->getMessage()) . '<br>';
            echo 'File: ' . htmlspecialchars($exception->getFile()) . '<br>';
            echo 'Line: ' . $exception->getLine();
            echo '</div>';
        }

        echo '<button onclick="window.history.back()" class="telegram-btn telegram-btn-primary">Go Back</button>';
        echo '</div>';
        telegram_footer();
    } else {
        $response = [
            'success' => false,
            'error' => 'Internal server error',
            'route' => $route
        ];

        if (get_config('debug_mode', false)) {
            $response['debug'] = [
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString()
            ];
        }

        echo json_encode($response);
    }
}

/**
 * Helper function to get route parameters
 */
function get_route_param($index, $default = null)
{
    return $GLOBALS['route_params'][$index] ?? $default;
}

/**
 * Helper function to get current route
 */
function get_current_route()
{
    return $GLOBALS['current_route'] ?? '';
}

/**
 * URL helper for generating links
 */
function telebook_url($path = '', $params = [])
{
    $base = '/telebook/' . ltrim($path, '/');

    if (is_telegram_iframe()) {
        $params['iframe'] = '1';
        $params['telegram'] = '1';
    }

    if (!empty($params)) {
        $base .= '?' . http_build_query($params);
    }

    return $base;
}

/**
 * Redirect helper
 */
function telebook_redirect($path, $params = [])
{
    $url = telebook_url($path, $params);

    if (is_telegram_iframe()) {
        echo '<script>window.location.href = "' . addslashes($url) . '";</script>';
        echo '<p>Redirecting to <a href="' . htmlspecialchars($url) . '">' . htmlspecialchars($path) . '</a>...</p>';
    } else {
        header('Location: ' . $url);
    }
    exit();
}
