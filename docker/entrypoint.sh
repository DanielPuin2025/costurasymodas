#!/bin/sh
php /opt/init-db.php || true
exec apache2-foreground
