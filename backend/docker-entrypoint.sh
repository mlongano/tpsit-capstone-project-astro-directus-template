#!/bin/sh
set -e
node /usr/share/nginx/configurator /usr/share/nginx/html/swagger-initializer.js
if [ -f /.env ]; then set -a; . /.env; set +a; fi
cat /usr/share/nginx/html/swagger-initializer.js | envsubst '${DIRECTUS_ADMIN_TOKEN}' > /tmp/swagger-initializer.tmp
cat /tmp/swagger-initializer.tmp > /usr/share/nginx/html/swagger-initializer.js
rm /tmp/swagger-initializer.tmp
exec nginx -g 'daemon off;'
