<?php
require_once __DIR__ . '/../config/env.php';
$vendor = __DIR__ . '/../vendor/autoload.php';
if(file_exists($vendor)) {
    require_once $vendor;
}

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class Jwt {
    public static function encode(array $payload): string {
        $secret = env('APP_JWT_SECRET');
        return JWT::encode($payload, $secret, 'HS256');
    }

    public static function decode(string $token) {
        $secret = env('APP_JWT_SECRET');
        return JWT::decode($token, new Key($secret, 'HS256'));
    }
}
