# Everything runs in containers; the host only needs Docker.
export HOST_UID := $(shell id -u)
export HOST_GID := $(shell id -g)

COMPOSE := docker compose
PHP     := $(COMPOSE) run --rm --no-deps api
NODE    := $(COMPOSE) run --rm --no-deps frontend

.PHONY: dev down test check certs reset seed

dev: api/vendor api/.env frontend/node_modules docker/certs/cert.pem
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

test: api/vendor api/.env frontend/node_modules
	$(COMPOSE) up -d --wait postgres
	$(COMPOSE) exec -T postgres psql -U ukemochi -d ukemochi -tAc "SELECT 1 FROM pg_database WHERE datname = 'ukemochi_test'" | grep -q 1 \
		|| $(COMPOSE) exec -T postgres createdb -U ukemochi ukemochi_test
	$(PHP) php artisan test
	$(NODE) npm test

check: api/vendor api/.env frontend/node_modules
	$(PHP) vendor/bin/pint --test
	$(PHP) vendor/bin/phpstan analyse --no-progress --memory-limit=1G
	$(NODE) npm run lint
	$(NODE) npm run format:check
	$(NODE) npm run typecheck
	$(NODE) npm run build

# First admin (ADMIN_NAME / ADMIN_PIN) + the menu; the menu seeder skips when categories exist.
seed: api/vendor api/.env
	$(COMPOSE) up -d --wait postgres
	$(PHP) php artisan migrate --force
	$(PHP) php artisan db:seed --force
	$(PHP) php artisan db:seed --class=MenuSeeder --force

# Wipes the dev database, then seeds the first admin (ADMIN_NAME / ADMIN_PIN) and the menu.
reset: api/vendor api/.env
	$(COMPOSE) up -d --wait postgres
	$(PHP) php artisan migrate:fresh --force
	$(PHP) php artisan db:seed --force
	$(PHP) php artisan db:seed --class=MenuSeeder --force

certs:
	./docker/certs.sh

api/vendor: api/composer.lock
	$(PHP) composer install --no-interaction
	touch $@

api/.env:
	cp api/.env.example api/.env
	$(PHP) php artisan key:generate
	$(PHP) php -r '$$f = ".env"; $$r = fn () => bin2hex(random_bytes(20)); file_put_contents($$f, preg_replace(["/^REVERB_APP_ID=.*/m", "/^REVERB_APP_KEY=.*/m", "/^REVERB_APP_SECRET=.*/m"], ["REVERB_APP_ID=" . random_int(100000, 999999), "REVERB_APP_KEY=" . $$r(), "REVERB_APP_SECRET=" . $$r()], file_get_contents($$f)));'

frontend/node_modules: frontend/package-lock.json
	$(NODE) npm ci
	touch $@

docker/certs/cert.pem:
	./docker/certs.sh
