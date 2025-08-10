<?php
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__, 3) . '/config/env.php';
require_once dirname(__DIR__, 3) . '/lib/Jwt.php';
require_once __DIR__ . '/_db.php';

$botToken = env('TELEGRAM_BOT_TOKEN');
if(!$botToken) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'no_bot_token_configured']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$initDataRaw = $input['initDataRaw'] ?? '';

parse_str($initDataRaw, $data);
$hash = $data['hash'] ?? '';
unset($data['hash']);
ksort($data);
$dataCheckString = [];
foreach($data as $k=>$v) { $dataCheckString[] = $k.'='.$v; }
$dataCheckString = implode("\n", $dataCheckString);
$secretKey = hash_hmac('sha256', 'WebAppData', $botToken, true);
$calcHash = hash_hmac('sha256', $dataCheckString, $secretKey);
if(!hash_equals($calcHash, $hash)) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'invalid_signature']);
    exit;
}
$authDate = isset($data['auth_date']) ? (int)$data['auth_date'] : 0;
if(time() - $authDate > 600) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'expired']);
    exit;
}
$user = [];
if(isset($data['user'])) {
    $user = json_decode($data['user'], true) ?: [];
}

$pdo = db();
$stmt = $pdo->prepare('INSERT INTO users (id, first_name, last_name, username, photo_url, language_code)
    VALUES (:id,:fn,:ln,:un,:photo,:lang)
    ON CONFLICT(id) DO UPDATE SET first_name=:fn, last_name=:ln, username=:un, photo_url=:photo, language_code=:lang, updated_at=CURRENT_TIMESTAMP');
$stmt->execute([
    ':id' => $user['id'],
    ':fn' => $user['first_name'] ?? null,
    ':ln' => $user['last_name'] ?? null,
    ':un' => $user['username'] ?? null,
    ':photo' => $user['photo_url'] ?? null,
    ':lang' => $user['language_code'] ?? null
]);

$payload = [
    'sub' => (string)$user['id'],
    'username' => $user['username'] ?? ($user['first_name'] ?? ''),
    'iat' => time(),
    'exp' => time() + 7*24*60*60
];

$token = Jwt::encode($payload);

echo json_encode(['ok'=>true,'token'=>$token,'user'=>$user]);
