<?php
/**
 * Costuras y Modas — Conexión a la base de datos
 * Todos los demás archivos PHP incluyen este archivo con require.
 */

// Permite que el HTML (aunque esté en otra carpeta/puerto) pueda
// pedirle datos a estos archivos PHP sin que el navegador lo bloquee.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Si el navegador manda una petición de "verificación" (OPTIONS), respondemos vacío
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ---- Datos de conexión ----
// Si tu MySQL/XAMPP tiene otra contraseña, cámbiala en $password.
$host = '127.0.0.1';
$dbname = 'costuras_y_modas';
$usuario = 'root';
$password = ''; // vacío por defecto en XAMPP

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $usuario,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo conectar a la base de datos: ' . $e->getMessage()]);
    exit;
}

// Lee el cuerpo JSON que manda el JavaScript (fetch) y lo convierte en array de PHP
function leerJSON() {
    $datos = json_decode(file_get_contents('php://input'), true);
    return $datos ?: [];
}
