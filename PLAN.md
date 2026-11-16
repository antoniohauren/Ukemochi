# Ukemochi — Sushi Restaurant Ordering, Kitchen & Cash App

## Scope
One sushi restaurant, on its local network. Waitresses take dine-in (by customer name) and phone orders
(pickup/delivery), kitchen gets printed tickets (optional screen), bills can be edited/reopened any time,
split many ways, paid with mixed methods, and a cash shift close computes expected money.
UI in pt-BR and English (switchable).

## Decisions
- **Stack**: API = **Laravel** (PHP 8.4+). DB = **PostgreSQL**. Frontends = **Angular** PWAs (`@angular/pwa`) in one workspace. UI = **Angular Material** (https://material.angular.dev/).
- **Realtime**: **Laravel Reverb** + `laravel-echo`.
- **Runtime**: **Docker Compose** — postgres, api, reverb, scheduler, nginx (built Angular apps, proxies `/api` + Reverb socket).
- **HTTPS**: nginx TLS with a local CA cert (`mkcert`), CA installed on each phone/PC.
- **Apps**: `waitress` (mobile PWA), `admin` (web, includes `/kitchen`), library `shared`.
- **Hosting**: one local PC on the LAN, Windows or Linux. Printer on USB or Bluetooth, installed as an OS printer.
- **Auth**: user + 4-digit PIN per staff. Roles: admin, waitress, kitchen. Every change records user.
  - Sanctum SPA cookie sessions (httpOnly, SameSite, CSRF via `XSRF-TOKEN`).
  - Idle timeout 12h (`SESSION_LIFETIME=720`).
  - Wrong PINs: growing delay per name (1s, 2s, 4s… max 30s), resets on success.
  - Logout while server unreachable: app shows logged out, server session expires on idle timeout.
  - Admin app by role: admin sees everything, kitchen only `/kitchen`, waitress refused with a message.
- **Orders**: dine-in by customer name (no tables). Phone: pickup or delivery.
  Status: `open → ready → out_for_delivery (delivery only) → closed`; plus `cancelled` (reason note, excluded from revenue, CANCEL ticket).
  Any staff can edit/reopen closed orders.
- **Order number**: global sequential, never resets, no gaps (locked counter row inside the order transaction). On kitchen ticket and customer bill.
- **Menu**: Category → Item → Variant (each variant own price; item with no variants has one default variant). Optional priced add-ons per item.
  Item/variant "unavailable" toggle by admin or kitchen. Variant delete is a soft delete.
- **Charges**: none by default. Settings: delivery fee on/off + fixed value (editable per order).
- **Notes**: optional free-text note on every record (order, line, payment, customer, cash movement, edit).
- **Audit**: change log (who, when, entity, action, summary JSON, note) on every mutation. Admin can view.
- **Printing**: browser `window.print()` through the OS printer driver, manual "Imprimir" button. Kitchen ticket + customer bill (non-fiscal).
  Edit after print → "changed since print" badge; reprint marks the ticket "ATUALIZADO/UPDATED vN". Paper width 58/80mm.
- **Payments**: cash, credit, debit, pix (record only), combined. Cash shows change (`troco`).
  Delivery: pay upfront or on delivery (record method + "troco para R$X").
- **Split**: by amount, by item units (incl. fractions of one item), equal N ways, by consumed lines.
- **Cash shift**: manual open/close. Opening float, withdrawals/deposits (incl. type `staff_meal` + staff name, e.g. R$22 Amanda), counted vs expected, totals per method.
- **Customers**: name, phone (lookup key), many addresses, note, order history.
- **Admin**: menu CRUD, staff + PINs, reports (period, item, method, waitress), settings (name, paper width, delivery fee, language).
- **Stock**: opt-in per variant (e.g. Coca Zero, Combos). Sales subtract automatically (edit/cancel restores).
  Admin records purchases and corrections (loss, recount) with note. Stock screen: expected quantity (= movements sum), sold today, alert when ≤ optional per-variant minimum.
  Never blocks: stock may go negative. Waitress sees a badge on low/zero variants ("Restam 2", "Esgotado?").
- **Backup**: `pg_dump` on shift close + daily, keep last N; download in admin.

## UI
Modern and minimal. Material 3 theme in `shared`: one primary color, light + dark (follows system), system font, flat surfaces, whitespace instead of borders/dividers.
- **One primary action per screen**; secondary actions in an overflow menu (`mat-menu`).
- **Mobile looks native** (waitress, and admin under 600px):
  - Bottom tab bar (`BottomNav` in `shared`), 3–5 tabs, icon + label. Waitress: Pedidos, Novo, Clientes, Mais.
  - Top app bar with title + back arrow; no hamburger menu.
  - Pickers and quick actions as bottom sheets (`mat-bottom-sheet`); forms as full-screen dialogs.
  - Sticky bottom action bar for the main action (e.g. "Enviar pedido", total + "Pagar").
  - Installed PWA runs `standalone`, safe-area insets respected, 48px touch targets, inputs ≥16px, no hover-only UI.
- **Desktop admin**: side nav rail (`mat-sidenav`), list/detail layouts, tables only where data is tabular (reports, audit).
- **Feedback**: snackbars for success/undo, inline field errors, skeleton loaders for lists.

## Repo layout
```
docker-compose.yml        # postgres, api (php-fpm), reverb, scheduler, web (nginx + built Angular apps)
docker/                   # Dockerfiles + nginx config
Makefile                  # dev / test / check wrappers around docker compose
api/                      # Laravel app, clean architecture (see AGENTS.md)
  app/Domain/             # entities, value objects (Money), pure rules (totals, status, split, shift cash, ticket content)
  app/Application/        # use cases + ports (repository/clock/audit interfaces)
  app/Infrastructure/     # Eloquent models + repositories, backup, clock
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
                          # presentational components (AppShell, BottomNav, NumPad, MoneyInput, OrderLines, LangSwitch, TicketPrint...)
```
- API calls through one typed `ApiClient` service in `shared` (`HttpClient`).
- TS types in `shared` hand-written to mirror Laravel API Resources; feature tests assert the exact JSON shape.
- Validation: FormRequests on the API; typed reactive forms on the frontends.
- i18n: dictionary objects + `t` pipe/service. Money: integer cents, formatted with `Intl.NumberFormat`.

## Data model (PostgreSQL)
Money columns `bigint` cents. Timestamps `timestamptz`. Enum-like columns `text` + `CHECK`.
- `users(id, name, pin_hash, role, active)`
- `sessions` (Laravel database session driver)
- `counters(name PK, value)` — `order_number` row
- `categories(id, name, sort, active)`
- `items(id, category_id, name, note, active)`
- `variants(id, item_id, name, price_cents, available, sort, track_stock, stock_min NULL, deleted_at)` — e.g. "Inteiro 8un", "Meio 4un", "Coca Zero"
- `addons(id, item_id NULL, category_id NULL, name, price_cents, active)`
- `customers(id, name, phone UNIQUE NULL, note)`; `addresses(id, customer_id, text, note)`
- `orders(id = order number, type dine_in|pickup|delivery, status, customer_id NULL, customer_name, address_text, delivery_fee_cents, pay_on_delivery, change_for_cents, note, created_by, created_at, closed_at, cancel_reason, printed_version, version)`
- `order_lines(id, order_id, variant_id, item_name, variant_name, unit_price_cents, qty, note)` — names/prices snapshotted
- `line_addons(id, line_id, addon_id, name, price_cents)`
- `payments(id, order_id, shift_id, method cash|credit|debit|pix, amount_cents, tendered_cents NULL, payer_label, note, created_by, created_at, voided)`
- `payment_allocations(payment_id, line_id, qty_fraction numeric)` — split by units / by goods only
- `shifts(id, opened_by, opened_at, opening_float_cents, closed_by, closed_at, counted_cents, note)`
- `cash_movements(id, shift_id, kind withdrawal|deposit|staff_meal, amount_cents, staff_name, note, created_by, created_at)`
- `stock_movements(id, variant_id, delta, kind sale|purchase|adjust, order_line_id NULL, note, created_by, created_at)` — stock = Σ delta; line edit writes the difference, cancel writes the reverse
- `settings(key, value)`; `audit_log(id, user_id, at, entity, entity_id, action, summary jsonb, note)`

Rules:
- Order total = Σ(line qty × (unit + addons)) + delivery fee. Paid = Σ non-voided payments. Order closes when paid ≥ total (or manually).
- Editing a closed order reopens it (status → open), bumps `version`, writes audit. Over/under payment shown as balance.
- Cash change = tendered − amount (cash only). Payment stored at the amount applied, not tendered.
- Shift expected cash = opening float + cash payments − withdrawals − staff_meal + deposits. Difference = counted − expected.
- Payments link to the shift open at payment time; payment requires an open shift.

## Split logic (`api/app/Domain/Split`)
Pure functions returning `{payer_label, amount_cents, allocations?}` suggestions, exposed as a preview endpoint. The UI records each as a payment (any method).
- `equal(total, n)` — remainder cents go to first payers.
- `byAmount(amounts[])` — free amounts, last payer gets the rest.
- `byUnits(lines, picks)` — picks = `{line_id, qty}` per payer; fractions allowed (0.5 of a line).
- `byGoods(lines, assignment)` — whole lines per payer.
Unallocated remainder always visible.

## Printing
- `app/Domain/Ticket` builds ticket content. Kitchen: no prices, item notes, add-ons, `#<number> · <name> · <type>`, "UPDATED vN"/"CANCELADO". Bill: prices, payments, change, balance.
  `GET /api/orders/{id}/ticket?kind=kitchen|bill`.
- `TicketPrint` (`shared`) renders it: `@media print` + `@page` from the paper width setting, monospace.
- "Imprimir" → print view → `window.print()` → `POST /api/orders/{id}/printed {kind, version}` (stores `printed_version`, writes audit).
- Badges "not printed" / "changed since print" when `version > printed_version`; "cancel not printed" for cancelled orders.
- Printer PC: Chrome with `--kiosk-printing` skips the dialog.

## Realtime
Reverb private channel `orders` broadcasts `order.updated {id, version}` (`ShouldBroadcastNow`). Kitchen screen and waitress order list refetch on event. Channel auth through the session cookie.

## Steps
Each step is one TDD vertical slice. Done = tests green + `make check` clean + review findings fixed (workflow in AGENTS.md). One commit per step.

### Phase 1 — Foundation
- [x] **1. Repo scaffold** — Docker Compose (postgres, api, reverb, scheduler, web), nginx TLS with `mkcert` (script + CA install guide for phones), Laravel in `api/`, Angular workspace in `frontend/` (waitress, admin, shared), Pint + Larastan, ESLint + Prettier, TS strict, `Makefile` targets `dev`/`test`/`check`.
- [x] **2. Shared basics** — API: `Money` value object (cents, parse, format). Frontend `shared`: money format/parse pt-BR/en, i18n dictionaries + `t` pipe, typed `ApiClient` skeleton.
- [ ] **3. API skeleton** — `/api/health`, domain-error → HTTP mapping, Postgres connection, test DB setup, `audit_log` migration + `AuditLog` port.
- [ ] **4. Auth** — users table, PIN hash (`Hash`), Sanctum SPA cookie sessions (12h idle), login/logout/me, role middleware, seed first admin, growing delay on wrong PINs, audit on login/logout/seed.
- [ ] **5. Frontend scaffold** — Material 3 theme (light/dark), `AppShell` (bottom tabs on mobile, side nav rail on desktop), admin + waitress apps (PWA manifest + service worker), `ApiClient` with credentials + XSRF, login screen, language switch, admin route guards by role.

### Phase 2 — Menu, staff, settings
- [ ] **6. Menu API** — categories, items, variants (own price, soft delete), add-ons, availability toggles (admin + kitchen). Audited.
- [ ] **7. Admin menu screens** — master-detail CRUD UI for step 6.
- [ ] **8. Staff + settings** — staff CRUD with PIN reset; settings (restaurant name, language, paper width, delivery fee on/off + value). API + admin screens.

### Phase 3 — Orders
- [ ] **9. Order domain** — gapless sequential number, line snapshots (name/price), add-ons, notes, totals incl. delivery fee, status transitions, cancel with reason, reopen + version bump.
- [ ] **10. Orders API** — create/edit/cancel/status, audit log writes, Reverb `order.updated` broadcast + channel auth.
- [ ] **11. Waitress ordering** — order list (live via Echo), new order (dine-in name / pickup / delivery), add/edit lines with variant, add-ons, notes (bottom sheets); cancel.

### Phase 4 — Printing
- [ ] **12. Ticket content** — domain ticket builder (kitchen + bill), `GET /api/orders/{id}/ticket`.
- [ ] **13. Browser print** — `TicketPrint` view (58/80mm `@page`), "Imprimir" in waitress + admin, `POST /api/orders/{id}/printed`, print badges.

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

## Verification
- `make test`: Pest unit tests (split math, totals, shift expected cash, ticket content), feature tests through HTTP against a Postgres test database, Angular unit tests for services/pipes and components where behavior matters.
- Manual: `make dev`, log in as waitress on a phone over LAN, create order → Imprimir → kitchen ticket prints at 80mm (and 58mm after changing the setting), edit → "changed since print" → reprint shows "UPDATED", pay split with cash+pix → change correct, close shift → expected cash matches. Stock: Coca Zero stock 20, sell 17 → screen shows 3 + alert (min 5); waitress sees "Restam 3"; cancel order → back to 20.
- Mobile check at 360px: bottom tabs visible, no horizontal scroll, main action reachable with one thumb.
