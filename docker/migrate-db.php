<?php
/**
 * Script de migración para actualizar la base de datos existente
 * Se ejecuta cuando la base de datos ya existe pero necesita actualizaciones
 */

$host = getenv('DB_HOST') ?: '127.0.0.1';
$db   = getenv('DB_NAME') ?: 'costuras_y_modas';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: '';

echo "[migrate-db] Conectando a la base de datos...\n";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    echo "[migrate-db] Conexión exitosa\n";

    // Verificar si necesita migración
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tables)) {
        echo "[migrate-db] Base de datos vacía, usar init-db.php en su lugar\n";
        exit(0);
    }

    echo "[migrate-db] Aplicando migraciones...\n";

    // Migración 1: Asegurar que la tabla password_resets existe
    $hasPasswordResets = in_array('password_resets', $tables);
    if (!$hasPasswordResets) {
        echo "[migrate-db] Creando tabla password_resets...\n";
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(150) NOT NULL,
                token VARCHAR(100) NOT NULL UNIQUE,
                expira DATETIME NOT NULL,
                usado BOOLEAN NOT NULL DEFAULT FALSE,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (email),
                INDEX (token)
            )
        ");
    }

    // Migración 2: Actualizar configuración con nuevos valores
    echo "[migrate-db] Actualizando configuración...\n";

    $pdo->exec("
        INSERT INTO configuracion (clave, valor) VALUES
        ('adminUsuario','DSBJ'),
        ('adminPassword','DSBJ24032009')
        ON DUPLICATE KEY UPDATE valor=VALUES(valor)
    ");

    // Migración 3: Corregir typo adminUsuer si existe
    $pdo->exec("UPDATE configuracion SET clave='adminUsuario' WHERE clave='adminUsuer'");

    // Migración 4: Asegurar categorías por defecto
    $categorias = '["Camisas","Pantalones","Chaquetas","Uniformes","Overoles","Ofertas","General"]';
    $pdo->exec("
        INSERT INTO configuracion (clave, valor) VALUES
        ('categoriasProductos', '$categorias')
        ON DUPLICATE KEY UPDATE clave=clave
    ");

    // Migración 5: Actualizar usuario admin con password correcto
    $adminEmail = 'admin@costurasymodas.com';
    $adminPassword = '$2y$10$qb2Kvg1VUjgT1v9KYvlbVeLaET7CZ7aNhglFSNl/k6lKuGulGiwC'; // admin123

    $existeAdmin = $pdo->query("SELECT id FROM usuarios WHERE email='$adminEmail'")->fetch();
    if ($existeAdmin) {
        echo "[migrate-db] Actualizando usuario admin...\n";
        $pdo->exec("
            UPDATE usuarios
            SET password='$adminPassword', tipo='admin', activo=TRUE
            WHERE email='$adminEmail'
        ");
    } else {
        echo "[migrate-db] Creando usuario admin...\n";
        $pdo->exec("
            INSERT INTO usuarios (nombre, apellido, email, password, tipo, activo)
            VALUES ('Admin', 'Principal', '$adminEmail', '$adminPassword', 'admin', TRUE)
        ");
    }

    echo "[migrate-db] Migraciones completadas exitosamente\n";

} catch (PDOException $e) {
    echo "[migrate-db] ERROR: {$e->getMessage()}\n";
    exit(1);
}
