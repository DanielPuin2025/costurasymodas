# Costuras y Modas

Sistema de gestión de tienda de costura y modas con frontend HTML/CSS/JS y backend PHP.

## Estructura del Proyecto

```
costuras_y_modas/
├── Fronend/                    # Frontend de la aplicación
│   ├── index.html             # Página principal (redirecciona a tienda.html)
│   ├── tienda.html            # Tienda principal con catálogo
│   ├── tienda.js              # Lógica de la tienda
│   ├── tienda.css             # Estilos de la tienda
│   ├── panel.html             # Panel de administración
│   ├── panel.js               # Lógica del panel admin
│   ├── panel.css              # Estilos del panel
│   ├── costuras_y_modas.html  # Página adicional
│   ├── script.js              # Scripts generales
│   ├── registro.css           # Estilos de registro
│   ├── logo.png               # Logo de la empresa
│   ├── logo.jpg               # Logo alternativo
│   ├── favicon.ico            # Favicon
│   └── creador[1-3].[jpg|jpeg] # Imágenes de creadores
├── backend/                   # Backend PHP
│   └── api/                   # API REST
│       ├── config.php         # Configuración de BD
│       ├── configuracion.php  # Endpoints de configuración
│       ├── usuarios.php       # Endpoints de usuarios
│       ├── productos.php      # Endpoints de productos
│       └── pedidos.php        # Endpoints de pedidos
├── Base de datos/             # Scripts de base de datos
│   └── costuras_y_modas.sql  # Schema y datos iniciales
├── docker/                    # Configuración Docker
│   ├── entrypoint.sh         # Script de inicio
│   └── init-db.php           # Inicialización de BD
├── Dockerfile                 # Imagen Docker
└── docker-compose.yml         # Orquestación de contenedores
```

## Características

- **Frontend**: Interfaz moderna con HTML5, CSS3 y JavaScript vanilla
- **Backend**: API REST en PHP con PDO para MySQL
- **Base de Datos**: MySQL con esquema completo para e-commerce
- **Gestión de Usuarios**: Sistema de autenticación y roles (admin/cliente)
- **Catálogo de Productos**: CRUD completo con imágenes, categorías, colores
- **Sistema de Pedidos**: Gestión de pedidos con anticipo y confirmación
- **Panel Admin**: Interfaz completa para administración
- **Docker**: Configuración lista para deployment

## Requisitos

- PHP 7.4+
- MySQL 5.7+ / MariaDB 10.3+
- Apache/Nginx con mod_rewrite
- Docker (opcional)

## Instalación Local

### Con XAMPP/WAMP

1. Copiar el proyecto a `htdocs/` o `www/`
2. Importar `Base de datos/costuras_y_modas.sql` en phpMyAdmin
3. Configurar conexión en `backend/api/config.php` si es necesario
4. Acceder a `http://localhost/costuras_y_modas/Fronend/`

### Con Docker

```bash
docker-compose up -d
```

Acceder a `http://localhost/Fronend/`

## Credenciales por Defecto

**Usuario Admin:**
- Email: admin@costurasymodas.com
- Password: admin123

**Panel Admin (configuración):**
- Usuario: DSBJ
- Password: DSBJ24032009

## API Endpoints

### Usuarios
- `GET /backend/api/usuarios.php` - Listar usuarios
- `POST /backend/api/usuarios.php` - Crear usuario
- `PUT /backend/api/usuarios.php` - Actualizar usuario
- `DELETE /backend/api/usuarios.php` - Eliminar usuario

### Productos
- `GET /backend/api/productos.php` - Listar productos
- `POST /backend/api/productos.php` - Crear producto
- `PUT /backend/api/productos.php` - Actualizar producto
- `DELETE /backend/api/productos.php` - Eliminar producto

### Pedidos
- `GET /backend/api/pedidos.php` - Listar pedidos
- `POST /backend/api/pedidos.php` - Crear pedido
- `PUT /backend/api/pedidos.php` - Actualizar pedido

### Configuración
- `GET /backend/api/configuracion.php` - Obtener configuración
- `POST /backend/api/configuracion.php` - Actualizar configuración

## Base de Datos

### Tablas Principales

- `usuarios` - Usuarios del sistema (clientes y admins)
- `productos` - Catálogo de productos
- `pedidos` - Pedidos realizados
- `detalle_pedidos` - Items de cada pedido
- `ventas` - Registro de ventas manuales
- `configuracion` - Configuración de la tienda
- `logs` - Auditoría de acciones
- `password_resets` - Tokens de recuperación de contraseña

## Desarrollo

### Estructura de Frontend

- Todos los archivos HTML, CSS y JS están en `/Fronend/`
- `index.html` redirecciona automáticamente a `tienda.html`
- El panel de administración está en `panel.html`

### Estructura de Backend

- API REST en `/backend/api/`
- Cada endpoint es un archivo PHP independiente
- `config.php` contiene la configuración de BD y funciones comunes
- CORS habilitado para desarrollo local

## Deployment

Ver archivos de configuración Docker para deployment en producción.

## Licencia

Propietario - Costuras y Modas
