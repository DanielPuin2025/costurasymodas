# Guía Manual Simplificada - Despliegue en Easypanel

## Información del Proyecto

- **URL Easypanel**: http://144.126.156.160:3000/
- **Email**: danypuin2022@gmail.com
- **Proyecto**: preicfesonline
- **Dominio**: costurasymodas.programamega.com
- **IP**: 144.126.156.160
- **DNS TTL**: 14400 (4 horas)

---

## PASO 1: Acceder a Easypanel

1. Abre: http://144.126.156.160:3000/
2. Login con las credenciales guardadas
3. Selecciona el proyecto: **preicfesonline**

---

## PASO 2: Crear Base de Datos MySQL

### Crear el servicio
1. Click en **"+ Create Service"** o botón similar
2. Busca **"MySQL"** en la lista de templates
3. Selecciona **"MySQL 8.0"**

### Configurar MySQL
Completa estos campos:

```
Service Name: costuras-db
Database Name: costuras_y_modas
Root Password: Costuras2024!Segura
Version: 8.0
```

4. Click en **"Create"** o **"Deploy"**
5. Espera a que el estado sea **"Running"** (1-2 min)

---

## PASO 3: Importar Base de Datos

### Opción A: Desde la consola de Easypanel
1. Click en el servicio **costuras-db**
2. Busca **"Console"** o **"Terminal"**
3. Necesitas copiar y pegar el contenido de `costuras_y_modas.sql`

### Opción B: Usar phpMyAdmin (si está disponible)
1. Si Easypanel tiene phpMyAdmin integrado, úsalo
2. Selecciona `costuras_y_modas`
3. Import → Sube `costuras_y_modas.sql`

### Opción C: Desde tu PC con MySQL Client
```bash
# Si Easypanel expone el puerto MySQL públicamente
mysql -h 144.126.156.160 -P [puerto_mysql] -u root -pCosturas2024!Segura costuras_y_modas < costuras_y_modas.sql
```

---

## PASO 4: Crear Aplicación Web desde GitHub

### Crear el servicio
1. Vuelve al proyecto **preicfesonline**
2. Click en **"+ Create Service"** o **"Add App"**
3. Selecciona **"GitHub"** o **"Git Repository"**

### Si necesitas conectar GitHub primero
1. Click en **"Connect GitHub"**
2. Autoriza Easypanel
3. Continúa con los siguientes pasos

### Configurar repositorio
Completa estos campos:

```
Repository: DanielPuin2025/costurasymodas
Branch: main
Service Name: costuras-web
Build Method: Dockerfile
```

**IMPORTANTE**: Asegúrate de que **Build Method** sea **"Dockerfile"** o **"Docker"**

---

## PASO 5: Variables de Entorno

En la sección **"Environment Variables"** o **"Env"**, agrega cada una:

```bash
DB_HOST=costuras-db
DB_NAME=costuras_y_modas
DB_USER=root
DB_PASSWORD=Costuras2024!Segura
APP_ENV=production
APP_URL=https://costurasymodas.programamega.com
```

**Nota**: `DB_HOST` debe ser exactamente `costuras-db` (el nombre del servicio MySQL)

---

## PASO 6: Configurar Dominio

### En la configuración del servicio web
1. Busca sección **"Domains"** o **"Custom Domain"**
2. Click en **"Add Domain"**
3. Ingresa: `costurasymodas.programamega.com`
4. Activa **"Enable SSL"** si hay opción (Easypanel usa Let's Encrypt automáticamente)

---

## PASO 7: Desplegar

1. Revisa que todo esté correcto:
   - ✅ Build Method: Dockerfile
   - ✅ Variables de entorno: 6 variables agregadas
   - ✅ Dominio configurado
   
2. Click en **"Deploy"** o **"Create & Deploy"**
3. Espera 3-5 minutos
4. El estado debe cambiar a **"Running"**

---

## PASO 8: Verificar Despliegue

### Revisar logs
1. Click en el servicio **costuras-web**
2. Ve a **"Logs"**
3. Busca errores (especialmente de base de datos)

### Probar la aplicación
Abre en el navegador:
- **Dominio**: https://costurasymodas.programamega.com
- **URL temporal**: La que te da Easypanel (ej: `costuras-web.xxxx.easypanel.host`)

### Si funciona
✅ Deberías ver la tienda
✅ Panel admin: https://costurasymodas.programamega.com/panel.html
   - Usuario: `DSBJ`
   - Password: `DSBJ24032009`

---

## PASO 9: Seguridad Post-Despliegue

**CRÍTICO - Hacer inmediatamente:**

1. Accede al panel admin
2. Cambia el usuario y contraseña por defecto
3. Configura WhatsApp, Nequi, etc.

---

## Troubleshooting

### Error: "Cannot connect to database"
**Solución**:
- Verifica que `DB_HOST=costuras-db` (sin http://, sin puerto)
- Verifica que el servicio MySQL esté **Running**
- Verifica que la contraseña sea exactamente la misma

### Error: "502 Bad Gateway" o "503 Service Unavailable"
**Solución**:
- El contenedor está iniciando, espera 1-2 minutos más
- Revisa los logs del servicio web

### Error: "404 Not Found" en APIs
**Solución**:
- Verifica que el `.htaccess` esté en el repositorio
- Revisa los logs de Apache

### El dominio no carga
**Solución**:
- Verifica que el DNS esté propagado: https://dnschecker.org
- Usa la URL temporal de Easypanel mientras tanto
- El TTL es 14400 (4 horas), puede tardar en propagarse

### Base de datos vacía
**Solución**:
- Importa manualmente `costuras_y_modas.sql`
- Desde la consola del contenedor MySQL o phpMyAdmin

---

## Resumen de Configuración

| Item | Valor |
|------|-------|
| Proyecto Easypanel | preicfesonline |
| Servicio MySQL | costuras-db |
| Servicio Web | costuras-web |
| Repositorio | github.com/DanielPuin2025/costurasymodas |
| Branch | main |
| Dominio | costurasymodas.programamega.com |
| IP VPS | 144.126.156.160 |
| DB Password | Costuras2024!Segura |

---

## Comandos Útiles (si tienes acceso SSH)

```bash
# Ver contenedores corriendo
docker ps

# Ver logs del servicio web
docker logs costuras-web -f

# Ver logs de MySQL
docker logs costuras-db -f

# Acceder a la consola de MySQL
docker exec -it costuras-db mysql -u root -pCosturas2024!Segura costuras_y_modas

# Importar SQL manualmente
docker exec -i costuras-db mysql -u root -pCosturas2024!Segura costuras_y_modas < costuras_y_modas.sql
```

---

**¿Necesitas ayuda?** Sigue esta guía paso a paso y reporta en qué paso encuentras problemas.
