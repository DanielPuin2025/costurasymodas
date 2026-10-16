FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql mysqli \
    && a2enmod rewrite

COPY . /var/www/html/

# El SQL y los scripts de arranque quedan fuera del directorio público
RUN mv /var/www/html/costuras_y_modas.sql /opt/costuras_y_modas.sql \
    && mv /var/www/html/docker/init-db.php /opt/init-db.php \
    && mv /var/www/html/docker/entrypoint.sh /usr/local/bin/entrypoint.sh \
    && rm -rf /var/www/html/docker \
    && sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh \
    && chown -R www-data:www-data /var/www/html

RUN printf '<Directory /var/www/html/>\n    Options FollowSymLinks\n    AllowOverride All\n    Require all granted\n</Directory>\n' > /etc/apache2/conf-available/costuras.conf \
    && a2enconf costuras

EXPOSE 80

CMD ["/usr/local/bin/entrypoint.sh"]
