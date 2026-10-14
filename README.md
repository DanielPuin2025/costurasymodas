# Costuras y Modas

Sistema de gestión de tienda para negocio de confección y modas.

## Características

- Tienda en línea con catálogo de productos
- Sistema de solicitudes con código de verificación
- Panel administrativo para gestión de productos, pedidos y configuración
- Integración con WhatsApp para comunicación
- Sistema de pago con anticipo (Nequi)

## Tecnologías

- Frontend: HTML, CSS, JavaScript vanilla
- Backend: PHP + MySQL
- Base de datos: MySQL

## Instalación

1. Clonar el repositorio
2. Importar la base de datos desde `costuras_y_modas.sql`
3. Configurar la conexión en `api/config.php`
4. Apuntar el servidor web a la carpeta del proyecto

## Configuración de Base de Datos

Actualizar las credenciales en `api/config.php`:

```php
$host = 'tu_host';
$dbname = 'costuras_y_modas';
$usuario = 'tu_usuario';
$password = 'tu_password';
```

## Estructura del Proyecto

- `index.html` - Página de inicio (redirige a tienda)
- `tienda.html` - Tienda principal
- `panel.html` - Panel administrativo
- `api/` - Endpoints PHP
- `costuras_y_modas.sql` - Schema de base de datos

## Despliegue

Este proyecto está configurado para desplegarse en Easypanel.

Dominio: https://costuras&modas.programamega.com
