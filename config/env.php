<?php
// Load environment variables from .env if present
$envFile = __DIR__ . '/../.env';
if(file_exists($envFile)) {
    foreach(file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if($line === '' || str_starts_with($line, '#')) continue;
        [$name, $value] = array_map('trim', explode('=', $line, 2));
        if($name !== '' && getenv($name) === false) {
            putenv("$name=$value");
            $_ENV[$name] = $value;
        }
    }
}

function env(string $key, $default = null) {
    $value = getenv($key);
    return $value === false ? $default : $value;
}
