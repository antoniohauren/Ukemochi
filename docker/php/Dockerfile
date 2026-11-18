FROM php:8.4-fpm-alpine

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions pdo_pgsql pcntl intl zip opcache
# pg_dump for backups; major version matches the postgres service.
RUN apk add --no-cache postgresql18-client
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# Containers run as the host user (compose `user:`), so php-fpm and composer need a writable HOME.
ENV HOME=/tmp COMPOSER_HOME=/tmp/composer
WORKDIR /var/www/api
