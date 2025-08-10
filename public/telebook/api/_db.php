<?php
function db(): PDO {
    static $pdo;
    if($pdo) return $pdo;
    $dbFile = dirname(__DIR__, 3) . '/telebook.sqlite';
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        username VARCHAR(100),
        photo_url TEXT,
        language_code VARCHAR(10),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )');
    return $pdo;
}
