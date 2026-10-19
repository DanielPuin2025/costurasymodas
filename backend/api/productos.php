<?php
/**
 * Costuras y Modas — API de Productos
 * GET    /api/productos.php          -> lista todos los productos
 * GET    /api/productos.php?id=1     -> un producto
 * POST   /api/productos.php          -> crea un producto
 * PUT    /api/productos.php?id=1     -> edita un producto
 * DELETE /api/productos.php?id=1     -> elimina un producto
 */

require 'config.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

// Auto-migración: columna color (para bases ya instaladas)
function columnaExiste($pdo, $tabla, $columna) {
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `$tabla` LIKE ?");
        $stmt->execute([$columna]);
        return (bool) $stmt->fetch();
    } catch (Exception $e) { return false; }
}
try {
    if (!columnaExiste($pdo, 'productos', 'color')) {
        $pdo->exec("ALTER TABLE productos ADD COLUMN color VARCHAR(100) NULL AFTER categoria");
    }
} catch (Exception $e) {}

switch ($metodo) {

    case 'GET':
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM productos WHERE id = ?');
            $stmt->execute([$id]);
            $producto = $stmt->fetch();
            echo json_encode($producto ?: []);
        } else {
            $stmt = $pdo->query('SELECT * FROM productos ORDER BY creado_en DESC');
            echo json_encode($stmt->fetchAll());
        }
        break;

    case 'POST':
        $d = leerJSON();
        $stockVal = $d['stock'] ?? $d['Cantidad'] ?? $d['cantidad'] ?? 0;
        $stmt = $pdo->prepare(
            'INSERT INTO productos (nombre, categoria, color, precio, stock, material, tallas, descripcion, imagen, disponible)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $d['nombre'] ?? '',
            $d['categoria'] ?? '',
            $d['color'] ?? '',
            $d['precio'] ?? 0,
            $stockVal,
            $d['material'] ?? '',
            $d['tallas'] ?? '',
            $d['descripcion'] ?? '',
            $d['imagen'] ?? '',
            isset($d['disponible']) ? (int) $d['disponible'] : 1,
        ]);
        echo json_encode(['id' => $pdo->lastInsertId(), 'mensaje' => 'Producto creado']);
        break;

    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'Falta el id']); break; }
        $d = leerJSON();
        $stockVal = $d['stock'] ?? $d['Cantidad'] ?? $d['cantidad'] ?? 0;
        $stmt = $pdo->prepare(
            'UPDATE productos SET nombre=?, categoria=?, color=?, precio=?, stock=?, material=?, tallas=?, descripcion=?, imagen=?, disponible=?
             WHERE id=?'
        );
        $stmt->execute([
            $d['nombre'] ?? '',
            $d['categoria'] ?? '',
            $d['color'] ?? '',
            $d['precio'] ?? 0,
            $stockVal,
            $d['material'] ?? '',
            $d['tallas'] ?? '',
            $d['descripcion'] ?? '',
            $d['imagen'] ?? '',
            isset($d['disponible']) ? (int) $d['disponible'] : 1,
            $id,
        ]);
        echo json_encode(['mensaje' => 'Producto actualizado']);
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'Falta el id']); break; }
        try {
            // Intenta borrado físico; si tiene pedidos/ventas fallará por FK
            $stmt = $pdo->prepare('DELETE FROM productos WHERE id = ?');
            $stmt->execute([$id]);
            // Si no borró nada (id no existe)
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Producto no encontrado']);
                break;
            }
            echo json_encode(['mensaje' => 'Producto eliminado']);
        } catch (PDOException $e) {
            // 23000 = violación de FK (tiene detalle_pedidos o ventas)
            if ($e->getCode() === '23000') {
                try {
                    // Soft-delete: desactiva en vez de borrar para no romper historial
                    $stmt2 = $pdo->prepare('UPDATE productos SET disponible = 0, stock = 0 WHERE id = ?');
                    $stmt2->execute([$id]);
                    echo json_encode(['mensaje' => 'No se puede borrar: tiene pedidos/ventas asociados. Se desactivó y ocultó de la tienda.', 'advertencia' => true]);
                } catch (Exception $e2) {
                    http_response_code(500);
                    echo json_encode(['error' => 'No se pudo desactivar: ' . $e2->getMessage()]);
                }
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'No se pudo eliminar: ' . $e->getMessage()]);
            }
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
}
