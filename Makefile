# Everything runs in containers; the host only needs Docker.
export HOST_UID := $(shell id -u)
export HOST_GID := $(shell id -g)

COMPOSE := docker compose
PHP     := $(COMPOSE) run --rm --no-deps api
NODE    := $(COMPOSE) run --rm --no-deps frontend

.PHONY: dev down test check certs

dev: api/vendor api/.env frontend/node_modules docker/certs/cert.pem
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

test: api/vendor api/.env frontend/node_modules
	$(PHP) php artisan test
	$(NODE) npm test

check: api/vendor api/.env frontend/node_modules
	$(PHP) vendor/bin/pint --test
	$(PHP) vendor/bin/phpstan analyse --no-progress --memory-limit=1G
	$(NODE) npm run lint
	$(NODE) npm run format:check
	$(NODE) npm run typecheck

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
