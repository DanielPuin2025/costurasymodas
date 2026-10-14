<?php
/**
 * Costuras y Modas — API de Configuración
 * GET  /api/configuracion.php  -> devuelve toda la config como objeto {clave: valor}
 * POST /api/configuracion.php  -> guarda/actualiza una o varias claves
 */

require 'config.php';

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $stmt = $pdo->query('SELECT clave, valor FROM configuracion');
    $filas = $stmt->fetchAll();

    $config = [];
    foreach ($filas as $fila) {
        $config[$fila['clave']] = $fila['valor'];
    }
    echo json_encode($config);
    exit;
}

if ($metodo === 'POST') {
    // Recibe un objeto tipo {"nombreEmpresa": "...", "whatsapp": "..."} y guarda cada clave
    $d = leerJSON();

    $stmt = $pdo->prepare(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)'
    );

    foreach ($d as $clave => $valor) {
        $stmt->execute([$clave, $valor]);
    }

    echo json_encode(['mensaje' => 'Configuración guardada']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
