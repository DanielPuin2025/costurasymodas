# Deployment en Easypanel - Costuras y Modas

## Actualización de la Base de Datos

Este proyecto incluye un sistema automático de migración que actualiza la base de datos sin perder datos existentes.

### Cómo Funciona

1. **Primera vez (base de datos vacía):**
   - `init-db.php` crea todas las tablas y datos iniciales desde el archivo SQL

2. **Actualizaciones (base de datos existente):**
   - `migrate-db.php` aplica migraciones incrementales sin borrar datos
   - Se ejecuta automáticamente al reconstruir el contenedor

### Proceso de Actualización en Easypanel

#### Opción 1: Rebuild Automático (Recomendado)

1. Ve a tu proyecto en Easypanel
2. Haz clic en el servicio `web`
3. Click en **"Rebuild"**
4. Espera a que termine la construcción
5. El contenedor ejecutará automáticamente:
   - `init-db.php` (si la BD está vacía)
   - `migrate-db.php` (si la BD ya existe)

#### Opción 2: Deploy Manual

1. En tu terminal local:
```bash
git push origin main
```

2. En Easypanel:
   - El auto-deploy detectará los cambios
   - Reconstruirá la imagen automáticamente
   - Aplicará las migraciones

### Migraciones Incluidas

El script `migrate-db.php` aplica:

✅ Crear tabla `password_resets` si no existe  
✅ Actualizar configuración con credenciales admin  
✅ Corregir typo `adminUsuer` → `adminUsuario`  
✅ Asegurar categorías por defecto  
✅ Actualizar/crear usuario admin con password correcto

### Verificar que la Migración Funcionó

1. **Ver logs del contenedor en Easypanel:**
   - Click en el servicio `web`
   - Click en la pestaña "Logs"
   - Busca mensajes como:
     ```
     [entrypoint] Iniciando configuración de base de datos...
     [init-db] la base ya tiene datos, no se importa
     [entrypoint] Aplicando migraciones...
     [migrate-db] Conexión exitosa
     [migrate-db] Actualizando configuración...
     [migrate-db] Migraciones completadas exitosamente
     ```

2. **Probar el login:**
   - Ve a tu sitio: `https://costurasymodas.programamega.com/Fronend/`
   - Prueba login con:
     - Email: `admin@costurasymodas.com`
     - Password: `admin123`

### Configuración de Variables de Entorno

En Easypanel, asegúrate de tener estas variables:

```
DB_HOST=db
DB_NAME=costuras_y_modas
DB_USER=root
DB_PASSWORD=[tu-password-seguro]
```

### Estructura de Archivos en el Contenedor

```
/opt/
├── costuras_y_modas.sql    # Schema completo (backup)
├── init-db.php             # Inicialización (primera vez)
└── migrate-db.php          # Migraciones (actualizaciones)

/var/www/html/
├── Fronend/                # Frontend público
├── backend/                # API PHP
├── .htaccess              # Configuración Apache
└── [otros archivos]
```

### Troubleshooting

**Si las migraciones no se aplicaron:**

1. Forzar rebuild:
```bash
# En Easypanel: Settings → Advanced → Force Rebuild
```

2. Ejecutar manualmente en el contenedor:
```bash
# En Easypanel: Click en Terminal del servicio web
php /opt/migrate-db.php
```

**Si perdiste acceso admin:**

Ejecutar en el contenedor:
```bash
php -r "
\$pdo = new PDO('mysql:host=db;dbname=costuras_y_modas', 'root', 'tu-password');
\$hash = '\$2y\$10\$qb2Kvg1VUjgT1v9KYvlbVeLaET7CZ7aNhglFSNl/k6lKuGulGiwC';
\$pdo->exec(\"UPDATE usuarios SET password='\$hash', tipo='admin' WHERE email='admin@costurasymodas.com'\");
echo 'Usuario admin restaurado\n';
"
```

### Credenciales por Defecto

**Usuario Admin (Login):**
- Email: `admin@costurasymodas.com`
- Password: `admin123`

**Panel Admin (Configuración):**
- Usuario: `DSBJ`
- Password: `DSBJ24032009`

⚠️ **IMPORTANTE:** Cambia estas credenciales después del primer login.

## Próximos Pasos Después de Deploy

1. ✅ Verificar que el sitio carga: `https://costurasymodas.programamega.com/Fronend/`
2. ✅ Probar login admin
3. ✅ Verificar que la API responde: `https://costurasymodas.programamega.com/backend/api/productos.php`
4. ⚠️ Cambiar credenciales por defecto
5. ⚠️ Configurar WhatsApp y métodos de pago en el panel
6. ⚠️ Agregar productos reales

## Soporte

Para problemas con el deployment:
- Revisa los logs en Easypanel
- Verifica las variables de entorno
- Asegúrate que el servicio `db` esté corriendo
