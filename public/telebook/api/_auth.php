<?php
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__, 3) . '/lib/Jwt.php';

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if(!preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']);
    exit;
}
$token = $matches[1];
try {
    $payload = Jwt::decode($token);
    if(isset($payload->exp) && $payload->exp < time()) {
        http_response_code(401);
        echo json_encode(['ok'=>false,'error'=>'expired']);
        exit;
    }
    $authUserId = $payload->sub;
} catch(Exception $e) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'invalid_token']);
    exit;
}
