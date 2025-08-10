<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/_auth.php';
require __DIR__ . '/_db.php';

$pdo = db();
$stmt = $pdo->prepare('SELECT id, first_name, last_name, username, photo_url, language_code FROM users WHERE id = :id');
$stmt->execute([':id' => $authUserId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode(['ok' => true, 'user' => $user]);
