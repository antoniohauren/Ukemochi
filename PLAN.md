# Ukemochi — Sushi Restaurant Ordering, Kitchen & Cash App

## Context
Restart of the project on a new stack (the first attempt, a Bun/Hono/React monorepo, lives on `main`).
No code is carried over; this plan is the starting point. One sushi restaurant needs:
waitresses take dine-in (by customer name) and phone orders (pickup/delivery), kitchen gets
thermal-printed tickets (optional screen), bills can be edited/reopened any time, split many
ways, paid with mixed methods, and a cash shift close computes expected money.
Runs on the restaurant's local network. UI in pt-BR and English (switchable).

## Decisions (from Q&A)
- **Stack**: API = **Laravel** (PHP 8.4+, latest stable Laravel). DB = **PostgreSQL**. Frontends = **Angular** PWAs (`@angular/pwa` service worker) in one Angular workspace. UI = **Angular Material** (https://material.angular.dev/).
- **Realtime**: **Laravel Reverb** (first-party WebSocket server) + `laravel-echo` on the frontends.
- **Runtime**: everything in **Docker Compose** — postgres, Laravel API, Reverb, scheduler, nginx serving the built Angular apps and proxying `/api` + the Reverb socket. One `docker compose up` on the server PC.
- **Apps**: `frontend/projects/waitress` (mobile PWA), `frontend/projects/admin` (web; includes `/kitchen` route), shared library `frontend/projects/shared`.
- **Hosting**: one server PC on LAN runs the compose stack. OS undecided → print adapter for Linux and Windows.
- **Auth**: user + 4-digit PIN per staff. Roles: admin, waitress, kitchen. Every change records user.
- **Orders**: dine-in identified by customer name (no tables). Phone: pickup or delivery.
  Status: `open → ready → out_for_delivery (delivery only) → closed`; plus `cancelled` (reason note, excluded from revenue, prints CANCEL ticket).
  Any staff can edit/reopen closed orders.
- **Order number**: global sequential, never resets. Printed on kitchen ticket and customer bill.
- **Menu**: Category → Item → Variant (each variant own price; item with no variants has one default variant). Optional priced add-ons per item. Item/variant "unavailable" toggle.
- **Charges**: none by default. Settings: delivery fee on/off + fixed value (editable per order).
- **Notes**: optional free-text note on every record (order, line, payment, customer, cash movement, edit).
- **Audit**: light change log (who, when, entity, action, summary JSON, note). Admin can view. Built in the API skeleton so every mutation audits from day one.
- **Printing**: one printer, USB on server, ESC/POS. Prints kitchen ticket + customer bill (non-fiscal).
  Edit after print → reprint whole ticket marked "ATUALIZADO/UPDATED". Paper width configurable (58/80mm).
  Android waitress may print via Web Bluetooth; fallback = POST to server → USB.
- **Payments**: cash, credit, debit, pix (record only), combined. Cash shows change (`troco`).
  Delivery: pay upfront or on delivery (record method + "troco para R$X").
- **Split**: by amount, by item units (incl. fractions of one item), equal N ways, by consumed lines.
- **Cash shift**: manual open/close. Opening float, withdrawals/deposits (incl. type `staff_meal` + staff name, e.g. R$22 Amanda), counted vs expected, totals per method.
- **Customers**: name, phone (lookup key), many addresses, note, order history.
- **Admin**: menu CRUD, staff + PINs, reports (period, item, method, waitress), settings (name, printer, paper width, delivery fee, language).
- **Stock**: opt-in per variant (e.g. Coca Zero, Combos). Sales subtract automatically (edit/cancel restores).
  Admin records purchases and manual corrections (loss, recount) with note. Stock screen shows expected quantity
  (= movements sum), sold today, and an alert when ≤ optional per-variant minimum.
  Never blocks: stock may go negative. Waitress sees a warning badge on low/zero variants ("Restam 2", "Esgotado?").
- **Backup**: automatic `pg_dump` on shift close + daily, keep last N; download button in admin.

## Repo layout
```
docker-compose.yml        # postgres, api (php-fpm), reverb, scheduler, web (nginx + built Angular apps)
docker/                   # Dockerfiles + nginx config
Makefile                  # dev / test / check wrappers around docker compose
api/                      # Laravel app, clean architecture (see AGENTS.md)
  app/Domain/             # entities, value objects (Money), pure rules (totals, status, split, shift cash, ticket layout)
  app/Application/        # use cases + ports (repository/printer/clock/audit interfaces)
  app/Infrastructure/     # Eloquent models + repositories, printer adapters, ESC/POS, backup, clock
  app/Http/               # controllers, FormRequests, API Resources, middleware
  app/Providers/          # composition root: binds ports to concrete classes
  database/migrations/    # Laravel migrations (Postgres)
  routes/api.php          # all routes under /api
  routes/channels.php     # Reverb channel auth
  tests/Unit, tests/Feature
frontend/                 # Angular workspace
  projects/waitress/      # Angular app + service worker
  projects/admin/         # Angular app; routes: menu, staff, orders, cash, reports, settings, audit, /kitchen
  projects/shared/        # library: API client + TS types, money format/parse, i18n dicts + t pipe, Material theme,
                          # presentational components (NumPad, MoneyInput, OrderLines, LangSwitch...)
```
Frontends call the API through one typed `ApiClient` service in `shared` (Angular `HttpClient`), no other fetch layer.
Validation: Laravel FormRequests on the API (trust boundary); typed reactive forms on the frontends.
i18n: plain dictionary objects + `t` pipe/service, no library. Money: always integer cents, formatted with `Intl.NumberFormat`.

## Data model (PostgreSQL)
Money columns are `bigint` cents. Timestamps are `timestamptz`. Enum-like columns are `text` + `CHECK`.
- `users(id, name, pin_hash, role, active)`
- `personal_access_tokens` (Sanctum) for sessions
- `categories(id, name, sort, active)`
- `items(id, category_id, name, note, active)`
- `variants(id, item_id, name, price_cents, available, sort)` — e.g. "Inteiro 8un", "Meio 4un", "Coca Zero"
- `addons(id, item_id NULL, category_id NULL, name, price_cents, active)`
- `customers(id, name, phone UNIQUE NULL, note)`; `addresses(id, customer_id, text, note)`
- `orders(id = order number (identity), type dine_in|pickup|delivery, status, customer_id NULL, customer_name, address_text, delivery_fee_cents, pay_on_delivery, change_for_cents, note, created_by, created_at, closed_at, cancel_reason, printed_version, version)`
- `order_lines(id, order_id, variant_id, item_name, variant_name, unit_price_cents, qty, note)` — names/prices snapshotted
- `line_addons(id, line_id, addon_id, name, price_cents)`
- `payments(id, order_id, shift_id, method cash|credit|debit|pix, amount_cents, tendered_cents NULL, payer_label, note, created_by, created_at, voided)`
- `payment_allocations(payment_id, line_id, qty_fraction numeric)` — only for split by units / by goods
- `shifts(id, opened_by, opened_at, opening_float_cents, closed_by, closed_at, counted_cents, note)`
- `cash_movements(id, shift_id, kind withdrawal|deposit|staff_meal, amount_cents, staff_name, note, created_by, created_at)`
- `variants` also gets `track_stock BOOL, stock_min NULL`
- `stock_movements(id, variant_id, delta, kind sale|purchase|adjust, order_line_id NULL, note, created_by, created_at)` — stock = Σ delta; line edit writes the difference, cancel writes the reverse
- `settings(key, value)`; `audit_log(id, user_id, at, entity, entity_id, action, summary jsonb, note)`

Rules:
- Order total = Σ(line qty × (unit + addons)) + delivery fee. Paid = Σ non-voided payments. Order closes when paid ≥ total (or manually).
- Editing a closed order reopens it (status → open), bumps `version`, writes audit. Over/under payment shown as balance.
- Cash change = tendered − amount (cash only). Payment stored at the amount applied, not tendered.
- Shift expected cash = opening float + cash payments − withdrawals − staff_meal + deposits. Difference = counted − expected.
- Payments link to the shift open at payment time; payment requires an open shift.

## Split logic (`api/app/Domain/Split`)
Pure PHP functions, return a list of `{payer_label, amount_cents, allocations?}` suggestions. The API exposes them
as a preview endpoint; the UI then records each as a payment (any method). Logic lives once, on the server:
- `equal(total, n)` — remainder cents go to first payers.
- `byAmount(amounts[])` — free amounts, last payer gets the rest.
- `byUnits(lines, picks)` — picks = `{line_id, qty}` per payer; fractions allowed (0.5 of a line).
- `byGoods(lines, assignment)` — whole lines per payer.
Unallocated remainder always visible. Covered by unit tests (rounding, fractions, remainder).

## Printing
- `app/Domain/Ticket`: builds text layout for kitchen ticket (no prices, item notes, add-ons, `#<number> · <name> · <type>`, "UPDATED vN"/"CANCELADO") and customer bill (prices, payments, change, balance). Width param (32/48 chars).
- `app/Infrastructure/Printing/EscPos.php`: text → ESC/POS bytes (init, bold, cut). Few lines, no dependency.
- Printer adapter by setting `printer.mode` = `linux_device` (path, device mapped into the api container) | `windows_share` (name) | `none` (writes to a file/log).
- Auto print kitchen ticket when order is created/edited (lines changed) → full reprint with version.
- Waitress app: "Imprimir" → Web Bluetooth (if supported + paired) else `POST /api/print/...`. Same bytes, fetched from API.

## Realtime
Reverb private channel `orders`: broadcasts `order.updated {id, version}` (`ShouldBroadcastNow`, so no queue worker).
Kitchen screen and waitress order list refetch on event. Channel auth through Sanctum token.

## Steps
Each step is one TDD vertical slice. Done = tests green + `make check` clean + review subagent findings fixed (workflow in AGENTS.md). One commit per step.

### Phase 1 — Foundation
- [ ] **1. Repo scaffold** — Docker Compose (postgres, api, reverb, scheduler, web), Laravel app in `api/`, Angular workspace in `frontend/` (waitress, admin, shared), Pint + Larastan, ESLint + Prettier, TS strict, `Makefile` targets `dev`/`test`/`check`.
- [ ] **2. Shared basics** — API: `Money` value object (cents, parse, format). Frontend `shared`: money format/parse pt-BR/en, i18n dictionaries + `t` pipe, typed `ApiClient` skeleton.
- [ ] **3. API skeleton** — `/api/health`, domain-error → HTTP mapping in the exception handler, Postgres connection, test DB setup, `audit_log` migration + `AuditLog` port.
- [ ] **4. Auth** — users table, PIN hash (`Hash`), Sanctum tokens, login/logout/me, role middleware, seed first admin, login attempt limit (`RateLimiter`), audit on login/logout/seed.
- [ ] **5. Frontend scaffold** — Material theme + base components in `shared`, admin + waitress apps (PWA manifest + service worker), auth interceptor, login screen, language switch.

### Phase 2 — Menu, staff, settings
- [ ] **6. Menu API** — categories, items, variants (own price), add-ons, availability toggles. Audited.
- [ ] **7. Admin menu screens** — master-detail CRUD UI for step 6.
- [ ] **8. Staff + settings** — staff CRUD with PIN reset; settings (restaurant name, language, paper width, printer mode, delivery fee on/off + value). API + admin screens.

### Phase 3 — Orders
- [ ] **9. Order domain** — sequential number, line snapshots (name/price), add-ons, notes, totals incl. delivery fee, status transitions, cancel with reason, reopen + version bump.
- [ ] **10. Orders API** — create/edit/cancel/status, audit log writes, Reverb `order.updated` broadcast + channel auth.
- [ ] **11. Waitress ordering** — order list (live via Echo), new order (dine-in name / pickup / delivery), add/edit lines with variant, add-ons, notes; cancel.

### Phase 4 — Printing
- [ ] **12. Ticket layouts** — kitchen ticket (no prices, `#N · name · type`, UPDATED vN / CANCELADO) and customer bill; 32/48 columns.
- [ ] **13. Printer** — ESC/POS encoder, adapters (`linux_device`, `windows_share`, `none` → file), auto kitchen print on create/edit/cancel, `POST /api/print/...` reprint.

### Phase 5 — Money
- [ ] **14. Cash shifts** — open with float, movements (withdrawal, deposit, staff_meal + staff name), close with count, expected cash + difference, totals per method.
- [ ] **15. Payments** — cash/credit/debit/pix, mixed, change calc, void, auto-close when paid, pay upfront or on delivery (`troco para`), payment requires open shift.
- [ ] **16. Split math** — equal N, by amount, by item units (fractions), by goods; remainder visible; preview endpoint.
- [ ] **17. Waitress payment UI** — pay screen, split flows, change display, bill print.
- [ ] **18. Admin cash + audit** — shift screens, movement entry, order status board (ready / out for delivery), audit log viewer, edit closed orders.

### Phase 6 — Customers
- [ ] **19. Customers** — profile (name, phone key, addresses, note), phone lookup while creating phone orders, order history.

### Phase 7 — Stock
- [ ] **20. Stock domain + API** — opt-in per variant, movements (sale auto, purchase, adjust), edit/cancel restore, optional minimum.
- [ ] **21. Stock UI** — admin stock screen (expected qty, sold today, alerts); waitress low/zero badges. Never blocks sales.

### Phase 8 — Reports & ops
- [ ] **22. Reports** — by period, item, payment method, waitress; shift report.
- [ ] **23. Backups** — `pg_dump` on shift close + daily (scheduler), keep last N, admin download.
- [ ] **24. Kitchen screen** — `/kitchen` in admin, live via Echo, mark ready.
- [ ] **25. Bluetooth print** — Web Bluetooth on Android waitress app, fallback to server print.

## Open questions
Decisions left open. Resolve before or during the step named. Carried over from the first attempt where they still apply.
- **Login lockout vs "never block staff"** (step 4): a hard lock after N wrong PINs lets anyone on the LAN lock out a staff member. Option: a growing delay per attempt instead of a hard lock.
- **Session length** (step 4): fixed expiry (e.g. 24h after login) vs idle timeout. Must fit shift length.
- **Token storage** (step 5): bearer token in `localStorage` is readable by any XSS. Option: Sanctum SPA cookie auth (httpOnly, SameSite) since API and apps share one origin behind nginx.
- **Logout revoke not retried** (step 5): if the server is unreachable at logout, the token is dropped locally but stays valid until it expires.
- **HTTPS on the LAN** (step 5): service workers only run in a secure context, so phones on `http://<server-ip>` get no PWA install or offline shell, and PIN + token (and the Reverb socket) cross the Wi-Fi in plain text. Option: self-signed or local-CA TLS in nginx.
- **API ↔ frontend types** (step 2): no shared language, so TS types in `shared` mirror Laravel API Resources by hand. Option: generate an OpenAPI spec (e.g. Scramble) and TS types from it.
- **Who toggles availability** (step 6): admin only, or kitchen/waitress too when an item runs out mid-shift.
- **Non-admins in the admin app** (step 7/8): refuse non-admin sessions in the admin app, or hide write controls by role.
- **Variant delete vs order lines** (step 9): once `order_lines.variant_id` references variants, use `nullOnDelete` (lines keep snapshots) or soft delete.
- **Order number gaps** (step 9): a Postgres identity skips a number when an insert's transaction rolls back. Accept gaps, or allocate the number from a locked counter row.
- **Printer from Docker** (step 13): `linux_device` needs the USB device mapped into the api container (`devices:`). On a Windows host, Docker Desktop cannot reach a USB/shared printer easily; may need a small host-side print relay.

## Verification
- `make test`: Pest unit tests (split math, totals, shift expected cash, ticket layout widths) and feature tests through HTTP against a Postgres test database; Angular unit tests for services/pipes and components where behavior matters.
- Manual: `make dev`, log in as waitress on a phone over LAN, create order → ticket prints (or `printer.mode=none` writes ticket text to a file for dev), edit → reprint "UPDATED", pay split with cash+pix → change correct, close shift → expected cash matches. Stock: Coca Zero stock 20, sell 17 → screen shows 3 + alert (min 5); waitress sees "Restam 3"; cancel order → back to 20.
