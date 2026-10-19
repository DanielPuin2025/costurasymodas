<?php
/**
 * Costuras y Modas — API de Pedidos / Solicitudes
 * GET   pedidos.php                    -> lista todos (con items y expira check)
 * GET   pedidos.php?usuario_id=1       -> de un usuario
 * POST  pedidos.php                    -> crea solicitud con metodo_pago, anticipo y expira
 * PATCH pedidos.php?id=1               -> acepta/rechaza con código
 */

require 'config.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

function columnaExiste($pdo, $tabla, $columna) {
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `$tabla` LIKE ?");
        $stmt->execute([$columna]);
        return (bool) $stmt->fetch();
    } catch (Exception $e) { return false; }
}

function getConfig($pdo, $clave, $def='') {
    try {
        $stmt = $pdo->prepare("SELECT valor FROM configuracion WHERE clave=?");
        $stmt->execute([$clave]);
        $r = $stmt->fetch();
        return $r ? $r['valor'] : $def;
    } catch(Exception $e){ return $def; }
}
// Auto-migración columnas faltantes (para XAMPP ya instalado)
try{
    if(!columnaExiste($pdo,'pedidos','whatsapp')) $pdo->exec("ALTER TABLE pedidos ADD COLUMN whatsapp VARCHAR(20) NULL AFTER telefono");
    if(!columnaExiste($pdo,'pedidos','codigo_verificacion')) $pdo->exec("ALTER TABLE pedidos ADD COLUMN codigo_verificacion VARCHAR(50) NULL AFTER estado");
    if(!columnaExiste($pdo,'pedidos','anticipo_monto')) $pdo->exec("ALTER TABLE pedidos ADD COLUMN anticipo_monto DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total");
    if(!columnaExiste($pdo,'pedidos','expira')) $pdo->exec("ALTER TABLE pedidos ADD COLUMN expira DATETIME NULL AFTER fecha");
    if(!columnaExiste($pdo,'pedidos','usuario_id')) $pdo->exec("ALTER TABLE pedidos ADD COLUMN usuario_id INT NULL AFTER id");
} catch(Exception $e){}

switch ($metodo) {

    case 'GET':
        // Auto-expira pendientes vencidos
        try {
            $pdo->exec("UPDATE pedidos SET estado='Expirado' WHERE estado='Pendiente' AND expira IS NOT NULL AND expira < NOW()");
        } catch(Exception $e){}
        $usuario_id = $_GET['usuario_id'] ?? null;
        $telefono = $_GET['telefono'] ?? null;
        $conItems = isset($_GET['con_items']);
        if ($usuario_id) {
            $stmt = $pdo->prepare('SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY fecha DESC');
            $stmt->execute([$usuario_id]);
            $pedidos = $stmt->fetchAll();
        } elseif ($telefono) {
            if (columnaExiste($pdo, 'pedidos', 'whatsapp')) {
                $stmt = $pdo->prepare('SELECT * FROM pedidos WHERE telefono = ? OR whatsapp = ? ORDER BY fecha DESC');
                $stmt->execute([$telefono, $telefono]);
            } else {
                $stmt = $pdo->prepare('SELECT * FROM pedidos WHERE telefono = ? ORDER BY fecha DESC');
                $stmt->execute([$telefono]);
            }
            $pedidos = $stmt->fetchAll();
        } else {
            $stmt = $pdo->query('SELECT * FROM pedidos ORDER BY fecha DESC');
            $pedidos = $stmt->fetchAll();
        }
        // Adjunta items y datos de usuario si se piden
        foreach($pedidos as &$p){
            try{
                $stmt2 = $pdo->prepare('SELECT dp.*, pr.nombre as producto_nombre, pr.imagen as producto_imagen FROM detalle_pedidos dp LEFT JOIN productos pr ON pr.id=dp.producto_id WHERE dp.pedido_id=?');
                $stmt2->execute([$p['id']]);
                $p['items'] = $stmt2->fetchAll();
                // Datos de usuario si tiene usuario_id
                if(!empty($p['usuario_id'])){
                    $stmtU = $pdo->prepare('SELECT email, nombre, apellido, telefono, whatsapp, ciudad, departamento FROM usuarios WHERE id=?');
                    $stmtU->execute([$p['usuario_id']]);
                    $p['usuario'] = $stmtU->fetch();
                }
                // Calcula dias restantes
                if(!empty($p['expira'])){
                    $diff = (strtotime($p['expira']) - time())/86400;
                    $p['dias_restantes'] = ceil($diff);
                }
            }catch(Exception $e){ $p['items']=[]; }
        }
        echo json_encode($pedidos);
        break;

    case 'POST':
        $d = leerJSON();
        $req = ['nombre','apellido','telefono','direccion','ciudad','departamento'];
        foreach ($req as $campo) {
            if (empty(trim($d[$campo] ?? ''))) {
                http_response_code(400);
                echo json_encode(['error' => 'Falta el campo: ' . $campo]);
                exit;
            }
        }
        if (empty($d['items']) || !is_array($d['items'])) {
            http_response_code(400);
            echo json_encode(['error' => 'El carrito está vacío']);
            exit;
        }
        // Terminos obbligatorio
        if (empty($d['terminos'])) {
            // no bloquea si no viene, pero avisa
        }

        $metodoPago = trim($d['metodo_pago'] ?? $d['metodoPago'] ?? 'contraentrega');
        // normaliza valores permitidos
        $permitidos = ['taller_fisico','contraentrega'];
        // compat: anticipo_nequi antiguo se mapea a contraentrega por Nequi
        if($metodoPago==='anticipo_nequi') $metodoPago='contraentrega';
        if(!in_array($metodoPago, $permitidos)) $metodoPago = 'taller_fisico';

        $hasWhatsapp = columnaExiste($pdo, 'pedidos', 'whatsapp');
        $hasCodigo = columnaExiste($pdo, 'pedidos', 'codigo_verificacion');
        $hasAnticipo = columnaExiste($pdo, 'pedidos', 'anticipo_monto');
        $hasExpira = columnaExiste($pdo, 'pedidos', 'expira');
        $hasUsuario = columnaExiste($pdo, 'pedidos', 'usuario_id');

        // Anticipo y expira
        $anticipoValor = intval(getConfig($pdo,'anticipoValor','40000'));
        $tiempoDias = intval(getConfig($pdo,'tiempoEsperaDias','10'));
        if($tiempoDias <1) $tiempoDias=10;
        $anticipo = ($metodoPago==='contraentrega') ? $anticipoValor : 0;
        $expira = date('Y-m-d H:i:s', strtotime("+$tiempoDias days"));

        $pdo->beginTransaction();
        try {
            // Construye INSERT dinámico según columnas que existen
            $cols = ['usuario_id','nombre','apellido','telefono','direccion','ciudad','departamento','metodo_pago','total','pago_confirmado','estado'];
            $vals = ['?','?','?','?','?','?','?','?','?','0','"Pendiente"'];
            $params = [
                !empty($d['usuario_id']) ? $d['usuario_id'] : null,
                trim($d['nombre']), trim($d['apellido']), trim($d['telefono']),
                trim($d['direccion']), trim($d['ciudad']), trim($d['departamento']),
                $metodoPago, floatval($d['total'] ?? 0)
            ];
            // Inserta whatsapp si existe
            if($hasWhatsapp){
                array_splice($cols, 4, 0, 'whatsapp');
                array_splice($vals, 4, 0, '?');
                array_splice($params, 4, 0, trim($d['whatsapp'] ?? $d['telefono']));
            }
            if($hasCodigo){
                $cols[]='codigo_verificacion'; $vals[]='NULL';
            }
            if($hasAnticipo){
                $cols[]='anticipo_monto'; $vals[]='?'; $params[]=$anticipo;
            }
            if($hasExpira){
                $cols[]='expira'; $vals[]='?'; $params[]=$expira;
            }
            // Si no hay usuario_id, quítalo
            if(!$hasUsuario){
                $idx = array_search('usuario_id',$cols);
                if($idx!==false){ array_splice($cols,$idx,1); array_splice($vals,$idx,1); array_splice($params,$idx,1); }
            }

            $sql = 'INSERT INTO pedidos ('.implode(',', $cols).') VALUES ('.implode(',', $vals).')';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $pedidoId = $pdo->lastInsertId();

            foreach (($d['items'] ?? []) as $item) {
                if (empty($item['productoId'])) continue;
                $stmtDetalle = $pdo->prepare('INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
                $stmtDetalle->execute([$pedidoId, $item['productoId'], intval($item['cantidad'] ?? 1), floatval($item['precio'] ?? 0)]);
            }

            $pdo->commit();
            echo json_encode(['id' => $pedidoId, 'mensaje' => 'Solicitud enviada. Espera confirmación del admin.','metodo_pago'=>$metodoPago,'anticipo'=>$anticipo,'expira'=>$expira]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'No se pudo crear la solicitud: ' . $e->getMessage()]);
        }
        break;

    case 'PATCH':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'Falta el id']); break; }
        $d = leerJSON();
        $accion = strtolower(trim($d['accion'] ?? 'aceptar'));
        $codigo = trim($d['codigo'] ?? '');
        $hasCodigo = columnaExiste($pdo, 'pedidos', 'codigo_verificacion');

        if ($accion === 'rechazar') {
            $stmt = $pdo->prepare('UPDATE pedidos SET estado = "Rechazada", pago_confirmado = 0 WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(['mensaje' => 'Solicitud rechazada']);
            break;
        }
        if ($accion === 'cancelar') {
            $stmt = $pdo->prepare('UPDATE pedidos SET estado = "Cancelado" WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(['mensaje' => 'Solicitud cancelada por el usuario']);
            break;
        }
        if (empty($codigo)) {
            http_response_code(400);
            echo json_encode(['error' => 'Debes proporcionar un código de verificación']);
            break;
        }
        if ($hasCodigo) {
            $stmt = $pdo->prepare('UPDATE pedidos SET estado = "Aceptada", pago_confirmado = 1, codigo_verificacion = ? WHERE id = ?');
            $stmt->execute([$codigo, $id]);
        } else {
            $stmt = $pdo->prepare('UPDATE pedidos SET estado = ?, pago_confirmado = 1 WHERE id = ?');
            $stmt->execute(['Aceptada - Código: ' . $codigo, $id]);
        }
        try {
            $stmtDet = $pdo->prepare('SELECT producto_id, cantidad FROM detalle_pedidos WHERE pedido_id = ?');
            $stmtDet->execute([$id]);
            foreach ($stmtDet->fetchAll() as $det) {
                $pdo->prepare('UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?')->execute([$det['cantidad'], $det['producto_id']]);
            }
        } catch (Exception $e) {}
        echo json_encode(['mensaje' => 'Solicitud aceptada con código ' . $codigo]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
}
