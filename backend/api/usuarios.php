<?php
/**
 * Costuras y Modas — API de Usuarios
 * POST ?accion=registro               -> crea cuenta
 * POST ?accion=login                  -> valida
 * POST ?accion=solicitar_recuperacion -> verifica email+nombre+telefono y genera token
 * POST ?accion=reset_password         -> cambia password con token
 * GET  ?accion=verificar_token&token= -> verifica validez
 * GET  (sin accion)                  -> lista usuarios
 */

require 'config.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$accion = $_GET['accion'] ?? '';

// Asegura que la tabla de resets exista (por si la BD es vieja y no se migró)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        token VARCHAR(100) NOT NULL UNIQUE,
        expira DATETIME NOT NULL,
        usado BOOLEAN NOT NULL DEFAULT FALSE,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (email),
        INDEX (token)
    )");
} catch (Exception $e) {}

if ($metodo === 'GET' && $accion === 'verificar_token') {
    $token = trim($_GET['token'] ?? '');
    if (!$token) { http_response_code(400); echo json_encode(['error'=>'Falta token']); exit; }
    $stmt = $pdo->prepare('SELECT * FROM password_resets WHERE token=? AND usado=0 AND expira > NOW()');
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) { http_response_code(404); echo json_encode(['error'=>'Token inválido o expirado']); exit; }
    echo json_encode(['valido'=>true, 'email'=>$row['email']]);
    exit;
}

if ($metodo === 'GET' && $accion === '') {
    // compat: lista sin accion
    if (!isset($_GET['accion'])) {
        $stmt = $pdo->query('SELECT id, nombre, apellido, email, telefono, whatsapp, ciudad, tipo, activo FROM usuarios ORDER BY creado_en DESC');
        echo json_encode($stmt->fetchAll());
        exit;
    }
}

if ($metodo === 'GET') {
    // lista usuarios si no es verificar_token
    $stmt = $pdo->query('SELECT id, nombre, apellido, email, telefono, whatsapp, ciudad, tipo, activo FROM usuarios ORDER BY creado_en DESC');
    echo json_encode($stmt->fetchAll());
    exit;
}

// --- SOLICITAR RECUPERACIÓN ---
if ($metodo === 'POST' && $accion === 'solicitar_recuperacion') {
    $d = leerJSON();
    $email = strtolower(trim($d['email'] ?? ''));
    $nombre = strtolower(trim($d['nombre'] ?? ''));
    $telefono = trim($d['telefono'] ?? '');

    if (!$email || !$nombre || !$telefono) {
        http_response_code(400);
        echo json_encode(['error' => 'Completa correo, nombre y teléfono']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE email = ?');
    $stmt->execute([$email]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        http_response_code(404);
        echo json_encode(['error' => 'No existe cuenta con ese correo']);
        exit;
    }

    // Verifica nombre (compara nombre o apellido) y teléfono (telefono o whatsapp)
    $nombreOk = (strtolower(trim($usuario['nombre'])) === $nombre) || (strtolower(trim($usuario['apellido'])) === $nombre) || (strtolower(trim($usuario['nombre'].' '.$usuario['apellido'])) === $nombre);
    $telOk = (trim($usuario['telefono']) === $telefono) || (trim($usuario['whatsapp']) === $telefono);

    if (!$nombreOk || !$telOk) {
        http_response_code(401);
        echo json_encode(['error' => 'Los datos no coinciden con tu registro (verifica nombre y teléfono tal como te registraste)']);
        exit;
    }

    if (!$usuario['activo']) {
        http_response_code(403);
        echo json_encode(['error' => 'Cuenta desactivada, contacta al admin']);
        exit;
    }

    // Genera token único
    $token = bin2hex(random_bytes(32)); // 64 chars
    $expira = date('Y-m-d H:i:s', time() + 3600); // 1 hora

    // Invalida tokens previos no usados de ese email
    $pdo->prepare('UPDATE password_resets SET usado=1 WHERE email=? AND usado=0')->execute([$email]);

    $stmt = $pdo->prepare('INSERT INTO password_resets (email, token, expira, usado) VALUES (?, ?, ?, 0)');
    $stmt->execute([$email, $token, $expira]);

    // En producción aquí se enviaría email con mail() o PHPMailer
    // Para demo devolvemos el link para que el front lo muestre como "correo simulado"
    $resetUrl = (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '') . '/costuras_y_modas.html?reset=' . $token;
    // Si no hay ORIGIN, usa ruta relativa
    if (empty($_SERVER['HTTP_ORIGIN'])) {
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $resetUrl = $scheme . '://' . $host . dirname($_SERVER['REQUEST_URI']) . '/costuras_y_modas.html?reset=' . $token;
        // fallback simple
        $resetUrl = 'costuras_y_modas.html?reset=' . $token;
    }

    // Simula envío: puedes ver el link en la respuesta
    echo json_encode([
        'mensaje' => 'Si los datos son correctos, se envió un link a tu correo (simulado abajo)',
        'token' => $token,
        'resetUrl' => $resetUrl,
        'expira' => $expira
    ]);
    exit;
}

// --- RESET PASSWORD CON TOKEN ---
if ($metodo === 'POST' && $accion === 'reset_password') {
    $d = leerJSON();
    $token = trim($d['token'] ?? '');
    $nueva = $d['nuevaPassword'] ?? $d['password'] ?? '';
    $confirmar = $d['confirmar'] ?? $d['confirmarPassword'] ?? $nueva;

    if (!$token || !$nueva) {
        http_response_code(400);
        echo json_encode(['error' => 'Falta token o nueva contraseña']);
        exit;
    }
    if (strlen($nueva) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'La contraseña debe tener al menos 6 caracteres']);
        exit;
    }
    if ($nueva !== $confirmar) {
        http_response_code(400);
        echo json_encode(['error' => 'Las contraseñas no coinciden']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT * FROM password_resets WHERE token=? AND usado=0 AND expira > NOW()');
    $stmt->execute([$token]);
    $reset = $stmt->fetch();
    if (!$reset) {
        http_response_code(400);
        echo json_encode(['error' => 'Token inválido, ya usado o expirado']);
        exit;
    }

    $hash = password_hash($nueva, PASSWORD_DEFAULT);
    $pdo->prepare('UPDATE usuarios SET password=? WHERE email=?')->execute([$hash, $reset['email']]);
    $pdo->prepare('UPDATE password_resets SET usado=1 WHERE id=?')->execute([$reset['id']]);

    echo json_encode(['mensaje' => 'Contraseña restablecida correctamente, ya puedes ingresar']);
    exit;
}

if ($metodo === 'POST' && $accion === 'registro') {
    $d = leerJSON();
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE email = ?');
    $stmt->execute([$d['email'] ?? '']);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Ya existe una cuenta con ese correo']);
        exit;
    }
    $hash = password_hash($d['password'] ?? '', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare(
        'INSERT INTO usuarios (nombre, apellido, email, password, telefono, whatsapp, departamento, ciudad, tipo, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, "cliente", 1)'
    );
    $stmt->execute([
        $d['nombre'] ?? '',
        $d['apellido'] ?? '',
        $d['email'] ?? '',
        $hash,
        $d['telefono'] ?? '',
        $d['whatsapp'] ?? '',
        $d['departamento'] ?? '',
        $d['ciudad'] ?? '',
    ]);
    echo json_encode(['id' => $pdo->lastInsertId(), 'mensaje' => 'Cuenta creada']);
    exit;
}

if ($metodo === 'POST' && $accion === 'login') {
    $d = leerJSON();
    $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE email = ?');
    $stmt->execute([$d['email'] ?? '']);
    $usuario = $stmt->fetch();
    if (!$usuario || !password_verify($d['password'] ?? '', $usuario['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Correo o contraseña incorrectos']);
        exit;
    }
    if (!$usuario['activo']) {
        http_response_code(403);
        echo json_encode(['error' => 'Esta cuenta está desactivada']);
        exit;
    }
    unset($usuario['password']);
    echo json_encode($usuario);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Petición no reconocida']);
