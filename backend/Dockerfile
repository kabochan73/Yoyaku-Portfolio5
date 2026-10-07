FROM serversideup/php:8.4-fpm-nginx AS dev

FROM serversideup/php:8.4-fpm-nginx AS production

# 起動のたびに php artisan optimize（config・route・view・event のキャッシュ）を流す。
# マイグレーションは backend サービスの pre-deploy で1回だけ流すので、ここでは止める
ENV AUTORUN_ENABLED=true \
    AUTORUN_LARAVEL_MIGRATION=false \
    AUTORUN_LARAVEL_STORAGE_LINK=false \
    PHP_OPCACHE_ENABLE=1

COPY --chown=www-data:www-data composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --no-autoloader

COPY --chown=www-data:www-data . .
RUN composer dump-autoload --no-dev --optimize
