<?php
// Importa costuras_y_modas.sql la primera vez (si no existe la tabla usuarios).
$host = getenv('DB_HOST') ?: '127.0.0.1';
$db   = getenv('DB_NAME') ?: 'costuras_y_modas';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: '';
$file = '/opt/costuras_y_modas.sql';

for ($i = 0; $i < 30; $i++) {
    try {
        $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        break;
    } catch (PDOException $e) {
        echo "[init-db] esperando MySQL ({$e->getMessage()})\n";
        sleep(2);
    }
}
if (!isset($pdo)) { echo "[init-db] no se pudo conectar, se omite la importación\n"; exit(0); }

try {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$db`");
    $existe = $pdo->query("SHOW TABLES LIKE 'usuarios'")->fetch();
    if ($existe) { echo "[init-db] la base ya tiene datos, no se importa\n"; exit(0); }
    $pdo->exec(file_get_contents($file));
    echo "[init-db] base de datos importada\n";
} catch (PDOException $e) {
    echo "[init-db] error: {$e->getMessage()}\n";
}
