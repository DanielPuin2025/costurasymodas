-- =========================================================
--  Costuras y Modas — Base de Datos (MySQL)
-- =========================================================

CREATE DATABASE IF NOT EXISTS costuras_y_modas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE costuras_y_modas;

-- ---------------------------------------------------------
-- 1. USUARIOS
-- ---------------------------------------------------------
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    whatsapp VARCHAR(20),
    departamento VARCHAR(100),
    ciudad VARCHAR(100),
    tipo ENUM('admin', 'cliente') NOT NULL DEFAULT 'cliente',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 2. PRODUCTOS
-- ---------------------------------------------------------
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(100),
    color VARCHAR(100) NULL,
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    material VARCHAR(100),
    tallas VARCHAR(100),
    descripcion TEXT,
    imagen LONGTEXT,
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 3. PEDIDOS (solicitudes con anticipo, expira 1-2 semanas)
-- ---------------------------------------------------------
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20) NULL,
    direccion VARCHAR(200) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'contraentrega',
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    anticipo_monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
    pago_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    codigo_verificacion VARCHAR(50) NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expira DATETIME NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- 4. DETALLE_PEDIDOS
-- ---------------------------------------------------------
CREATE TABLE detalle_pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------
-- 5. VENTAS (ventas registradas manualmente desde el panel)
-- ---------------------------------------------------------
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    cliente VARCHAR(150),
    total DECIMAL(10, 2) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------
-- 6. CONFIGURACION (clave/valor: logo, frase, whatsapp, pagos...)
-- ---------------------------------------------------------
CREATE TABLE configuracion (
    clave VARCHAR(100) PRIMARY KEY,
    valor TEXT
);

-- ---------------------------------------------------------
-- 7. LOGS (registro de acciones del administrador)
-- ---------------------------------------------------------
CREATE TABLE logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(100),
    accion VARCHAR(255),
    estado VARCHAR(50),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ---------------------------------------------------------
-- 8. PASSWORD_RESETS (recuperación de contraseña)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    expira DATETIME NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (email),
    INDEX (token)
);


-- =========================================================
--  DATOS INICIALES (seed)
-- =========================================================

-- Usuario administrador por defecto (corregido: tipo admin válido y password hasheado)
INSERT INTO
    usuarios (
        nombre,
        apellido,
        email,
        password,
        tipo,
        activo
    )
VALUES (
        'Admin',
        'Principal',
        'admin@costurasymodas.com',
        '$2y$10$qb2Kvg1VUjgT1v9KYvlbVeLaET7CZ7aNhglFSNl/k6lKuGulGiwC',
        'admin',
        TRUE
    )
ON DUPLICATE KEY UPDATE password=VALUES(password), tipo=VALUES(tipo);

-- Configuración inicial de la tienda
INSERT INTO
    configuracion (clave, valor)
VALUES (
        'nombreEmpresa',
        'Costuras y Modas'
    ),
    (
        'frase',
        'Moda con identidad, hecha a tu medida.'
    ),
    ('whatsapp', ''),
    ('telefonoTaller', ''),
    ('direccionTaller', 'Taller Costuras y Modas - Dirección por definir'),
    ('fotoTaller', ''),
    ('nequi', ''),
    ('tiempoEsperaDias', '10'),
    ('anticipoValor', '40000'),
    ('tiendaDisponible', '1'),
    ('horarioApertura', '08:00'),
    ('horarioCierre', '18:00'),
    ('horarioDias', 'Lunes a Sábado'),
    ('terminosCondiciones', 'Solo 2 métodos de pago: 1) Cliente paga y va al local (retira en el taller), 2) Contraentrega por Nequi con anticipo 40.000 COP vía Nequi. Si no estás en el lugar a la hora acordada y no avisaste, se retiene el anticipo. Tiempo de espera de solicitudes: 1 a 2 semanas, pasado ese tiempo se liberan.'),
    ('logo', ''),
    ('adminUsuario', 'DSBJ'),
    ('adminPassword', 'DSBJ24032009'),
    ('categoriasProductos', '["Camisas","Pantalones","Chaquetas","Uniformes","Overoles","Ofertas","General"]');

-- Producto de ejemplo
INSERT INTO
    productos (
        nombre,
        categoria,
        color,
        precio,
        stock,
        material,
        tallas,
        descripcion,
        disponible
    )
VALUES (
        'Vestido de noche',
        'Vestidos',
        'Rojo',
        89.99,
        45,
        'Seda',
        'S, M, L, XL',
        'Vestido elegante para ocasiones especiales.',
        TRUE
    )
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Parche para instalaciones ya existentes con typo adminUsuer y password incorrecto
UPDATE configuracion SET clave='adminUsuario' WHERE clave='adminUsuer';
INSERT INTO configuracion (clave, valor) VALUES ('adminUsuario','DSBJ') ON DUPLICATE KEY UPDATE valor=VALUES(valor);
INSERT INTO configuracion (clave, valor) VALUES ('adminPassword','DSBJ24032009') ON DUPLICATE KEY UPDATE valor=VALUES(valor);