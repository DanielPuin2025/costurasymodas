#!/bin/sh
echo "[entrypoint] Iniciando configuración de base de datos..."
php /opt/init-db.php || true
echo "[entrypoint] Aplicando migraciones..."
php /opt/migrate-db.php || true
echo "[entrypoint] Iniciando Apache..."
exec apache2-foreground
