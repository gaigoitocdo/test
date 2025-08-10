<?php
// public/telebook-router.php - Router chuẩn đã sửa
if (ob_get_level()) ob_end_clean();
ob_start();

error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

try {
    header('Content-Type: text/html; charset=UTF-8');
    header('Access-Control-Allow-Origin: http://localhost:3000');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
    
    if (session_status() === PHP_SESSION_NONE) @session_start();
    
    // Parse path
    $request_uri = $_SERVER['REQUEST_URI'] ?? '/';
    $url_path = parse_url($request_uri, PHP_URL_PATH);
    
    // Remove telebook prefix
    $url_path = str_replace('/telebook', '', $url_path);
    $url_path = trim($url_path, '/');
    $url_path = strtolower($url_path);
    
    // Default route
    if (empty($url_path)) $url_path = 'home';
    
    // ✅ Debug logging
    error_log("Telebook Router: Processing path '$url_path' from URI: $request_uri");
    
    // ✅ Route mapping - bao gồm review-detail
    $routes = [
        'home' => 'controllers/home.php',
        'support' => 'controllers/support.php', 
        'review' => 'controllers/review.php',
        'review-detail' => 'controllers/review-detail.php', // ✅ Thêm route này
        'profile' => 'controllers/profile.php',
        'booking' => 'controllers/booking.php',
        'test' => 'test.php',
        'admin' => 'admin/index.php',
    ];
    
    // ✅ Get route file
    $route_file = $routes[$url_path] ?? null;
    
    if (!$route_file) {
        error_log("Telebook Router: No route found for '$url_path', defaulting to home");
        $route_file = 'controllers/home.php';
    }
    
    $full_path = __DIR__ . '/telebook/' . $route_file;
    
    // ✅ Debug full path
    error_log("Telebook Router: Looking for file at: $full_path");
    
    // API special case
    if (strpos($url_path, 'api/') === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
        exit();
    }
    
    // ✅ 404 handling với debug info
    if (!file_exists($full_path)) {
        error_log("Telebook Router: File not found: $full_path");
        http_response_code(404);
        echo "<h1>404 Not Found</h1>";
        echo "<p><strong>Debug Info:</strong></p>";
        echo "<ul>";
        echo "<li>Request URI: <code>$request_uri</code></li>";
        echo "<li>Parsed path: <code>$url_path</code></li>";
        echo "<li>Route file: <code>$route_file</code></li>";
        echo "<li>Full path: <code>$full_path</code></li>";
        echo "<li>Available routes: <code>" . implode(', ', array_keys($routes)) . "</code></li>";
        echo "</ul>";
        exit();
    }
    
    // ✅ Set route variables for controller
    $_GET['route'] = $url_path;
    $_REQUEST['route'] = $url_path;
    
    // ✅ Extract and set parameters for review-detail
    if ($url_path === 'review-detail') {
        $key = $_GET['key'] ?? '';
        $id = $_GET['id'] ?? '';
        
        error_log("Telebook Router: review-detail params - key: '$key', id: '$id'");
        
        // Make sure parameters are available to the controller
        $_GET['key'] = $key;
        $_GET['id'] = $id;
        $_REQUEST['key'] = $key;
        $_REQUEST['id'] = $id;
    }
    
    error_log("Telebook Router: Including file: $full_path");
    
    // ✅ Include the controller file
    include $full_path;
    
} catch (Exception $e) {
    if (ob_get_level()) ob_end_clean();
    
    error_log("Telebook Router Exception: " . $e->getMessage());
    
    http_response_code(500);
    echo "<h1>500 Server Error</h1>";
    echo "<p>An error occurred while processing your request.</p>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
    echo "<p><strong>Debug Info:</strong></p>";
    echo "<ul>";
    echo "<li>Request URI: <code>" . ($_SERVER['REQUEST_URI'] ?? 'N/A') . "</code></li>";
    echo "<li>Error File: <code>" . $e->getFile() . "</code></li>";
    echo "<li>Error Line: <code>" . $e->getLine() . "</code></li>";
    echo "</ul>";
}

if (ob_get_level()) ob_end_flush();
?>