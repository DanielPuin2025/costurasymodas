# Guía de Despliegue en Easypanel

## Información del Proyecto

- **Dominio**: https://costuras&modas.programamega.com
- **Repositorio**: https://github.com/DanielPuin2025/costurasymodas
- **Proyecto Easypanel**: preicfesonline

## Pasos para Desplegar en Easypanel

### 1. Crear el Servicio en Easypanel

1. Accede a tu proyecto **preicfesonline** en Easypanel
2. Haz clic en **"Create Service"** o **"New App"**
3. Selecciona **"Deploy from GitHub"**

### 2. Configurar el Repositorio

1. Conecta tu cuenta de GitHub si no lo has hecho
2. Selecciona el repositorio: `DanielPuin2025/costurasymodas`
3. Selecciona la rama: `main`
4. Tipo de aplicación: **Docker** (usa el Dockerfile incluido)

### 3. Configurar Variables de Entorno

En la sección de **Environment Variables**, agrega las siguientes variables:

```env
DB_HOST=db
DB_NAME=costuras_y_modas
DB_USER=root
DB_PASSWORD=[tu_contraseña_segura]
APP_ENV=production
APP_URL=https://costuras&modas.programamega.com
```

### 4. Configurar Base de Datos

#### Opción A: Base de Datos Incluida en Easypanel

1. En el mismo proyecto, crea un servicio de MySQL
2. Conecta el servicio web con el servicio MySQL
3. La base de datos se inicializará automáticamente con `costuras_y_modas.sql`

#### Opción B: Base de Datos Externa

Si usas una base de datos externa, actualiza las variables:

```env
DB_HOST=[tu_host_externo]
DB_NAME=costuras_y_modas
DB_USER=[tu_usuario]
DB_PASSWORD=[tu_contraseña]
```

### 5. Configurar el Dominio

1. En la configuración del servicio, ve a **Domains**
2. Agrega el dominio: `costuras&modas.programamega.com`
3. Easypanel configurará automáticamente el SSL/HTTPS

### 6. Desplegar

1. Haz clic en **"Deploy"**
2. Easypanel descargará el código, construirá la imagen Docker y desplegará la aplicación
3. Espera a que el estado cambie a **"Running"**

## Estructura del Proyecto para Easypanel

El proyecto incluye:

- **Dockerfile**: Define la imagen PHP 8.2 con Apache y extensiones MySQL
- **docker-compose.yml**: Para pruebas locales y referencia
- **costuras_y_modas.sql**: Schema de base de datos que se importa automáticamente
- **.htaccess**: Configuración de Apache para reescritura de URLs y seguridad

## Verificación Post-Despliegue

1. Accede a: `https://costuras&modas.programamega.com`
2. Deberías ver la tienda funcionando
3. Prueba el panel admin: `https://costuras&modas.programamega.com/panel.html`
   - Usuario por defecto: `DSBJ`
   - Contraseña por defecto: `DSBJ24032009`

## Troubleshooting

### Error de Conexión a Base de Datos

- Verifica que las variables de entorno estén correctas
- Asegúrate de que el servicio MySQL esté corriendo
- Revisa los logs en Easypanel

### Error 404 en las APIs

- Verifica que Apache esté sirviendo desde `/var/www/html/`
- Revisa que el `.htaccess` esté presente
- Comprueba los logs de Apache

### Página en Blanco

- Revisa los logs de PHP en Easypanel
- Verifica que la base de datos esté inicializada con el schema
- Comprueba que las extensiones PHP (pdo, pdo_mysql) estén instaladas

## Actualizaciones Futuras

Para actualizar el código:

1. Haz push de tus cambios a GitHub:
   ```bash
   git add .
   git commit -m "Descripción del cambio"
   git push origin main
   ```

2. En Easypanel, haz clic en **"Redeploy"** o activa **"Auto Deploy"** para que se actualice automáticamente con cada push

## Seguridad Post-Despliegue

**IMPORTANTE**: Después del primer despliegue:

1. Cambia las credenciales de administrador por defecto en el panel
2. Actualiza la contraseña de la base de datos
3. Revisa los logs regularmente
4. Mantén el sistema actualizado

## Contacto

Para soporte: danypuin2022@gmail.com
