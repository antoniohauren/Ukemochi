# Ukemochi — Sushi Restaurant Ordering, Kitchen & Cash App

## Context
Greenfield (folder `/home/hauren/Projects/Ukemochi` is empty). One sushi restaurant needs:
waitresses take dine-in (by customer name) and phone orders (pickup/delivery), kitchen gets
thermal-printed tickets (optional screen), bills can be edited/reopened any time, split many
ways, paid with mixed methods, and a cash shift close computes expected money.
Runs on the restaurant's local network. UI in pt-BR and English (switchable).

## Decisions (from Q&A)
- **Stack**: Bun monorepo (workspaces). API = Hono on Bun. DB = SQLite (`bun:sqlite`). Frontends = React (Vite) PWAs. No React Native.
- **Apps**: `apps/waitress` (mobile PWA), `apps/admin` (web; includes `/kitchen` route), shared code in `packages/`.
- **Hosting**: one server PC on LAN serves API + both built PWAs. OS undecided → print adapter for Linux and Windows.
- **Auth**: user + 4-digit PIN per staff. Roles: admin, waitress, kitchen. Every change records user.
- **Orders**: dine-in identified by customer name (no tables). Phone: pickup or delivery.
  Status: `open → ready → out_for_delivery (delivery only) → closed`; plus `cancelled` (reason note, excluded from revenue, prints CANCEL ticket).
  Any staff can edit/reopen closed orders.
- **Order number**: global sequential, never resets. Printed on kitchen ticket and customer bill.
- **Menu**: Category → Item → Variant (each variant own price; item with no variants has one default variant). Optional priced add-ons per item. Item/variant "unavailable" toggle.
- **Charges**: none by default. Settings: delivery fee on/off + fixed value (editable per order).
- **Notes**: optional free-text note on every record (order, line, payment, customer, cash movement, edit).
- **Audit**: light change log (who, when, entity, action, summary JSON, note). Admin can view.
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
- **Backup**: automatic DB copy on shift close + daily, keep last N; download button in admin.

## Repo layout
```
package.json              # bun workspaces: apps/*, packages/*
apps/api/                 # Hono + bun:sqlite
  src/index.ts            # app, static serving of built PWAs, routes mount
  src/db.ts               # open DB, WAL, run migrations
  migrations/*.sql        # plain SQL, applied in order (table `_migrations`)
  src/routes/{auth,menu,orders,payments,shifts,customers,reports,settings,print,audit}.ts
  src/print/{escpos.ts,adapter.ts}   # adapter: linux (write /dev/usb/lp0) | windows (copy /b to shared printer)
  src/events.ts           # SSE stream for order changes (kitchen screen, waitress lists)
apps/waitress/            # Vite + React + vite-plugin-pwa
apps/admin/               # Vite + React; routes: menu, staff, orders, cash, reports, settings, audit, /kitchen
packages/shared/          # types, zod schemas, money (integer cents), split math, ticket layout, i18n dicts
packages/ui/              # shared React components (Button, NumPad, MoneyInput, OrderLines, LangSwitch...)
```
Frontends call the API with Hono's typed RPC client (`hono/client` `hc<AppType>`), no extra fetch layer.
Validation: `zod` + `@hono/zod-validator`. i18n: plain dictionary objects + `t()` hook, no library.
Money: always integer cents, formatted with `Intl.NumberFormat`.

## Data model (SQLite)
- `users(id, name, pin_hash, role, active)`
- `sessions(token, user_id, created_at)`
- `categories(id, name, sort, active)`
- `items(id, category_id, name, note, active)`
- `variants(id, item_id, name, price_cents, available, sort)` — e.g. "Inteiro 8un", "Meio 4un", "Coca Zero"
- `addons(id, item_id NULL, category_id NULL, name, price_cents, active)`
- `customers(id, name, phone UNIQUE NULL, note)`; `addresses(id, customer_id, text, note)`
- `orders(id = order number, type dine_in|pickup|delivery, status, customer_id NULL, customer_name, address_text, delivery_fee_cents, pay_on_delivery, change_for_cents, note, created_by, created_at, closed_at, cancel_reason, printed_version, version)`
- `order_lines(id, order_id, variant_id, item_name, variant_name, unit_price_cents, qty, note)` — names/prices snapshotted
- `line_addons(id, line_id, addon_id, name, price_cents)`
- `payments(id, order_id, shift_id, method cash|credit|debit|pix, amount_cents, tendered_cents NULL, payer_label, note, created_by, created_at, voided)`
- `payment_allocations(payment_id, line_id, qty_fraction)` — only for split by units / by goods
- `shifts(id, opened_by, opened_at, opening_float_cents, closed_by, closed_at, counted_cents, note)`
- `cash_movements(id, shift_id, kind withdrawal|deposit|staff_meal, amount_cents, staff_name, note, created_by, created_at)`
- `variants` also gets `track_stock BOOL, stock_min NULL`
- `stock_movements(id, variant_id, delta, kind sale|purchase|adjust, order_line_id NULL, note, created_by, created_at)` — stock = Σ delta; line edit writes the difference, cancel writes the reverse
- `settings(key, value)`; `audit_log(id, user_id, at, entity, entity_id, action, summary_json, note)`

Rules:
- Order total = Σ(line qty × (unit + addons)) + delivery fee. Paid = Σ non-voided payments. Order closes when paid ≥ total (or manually).
- Editing a closed order reopens it (status → open), bumps `version`, writes audit. Over/under payment shown as balance.
- Cash change = tendered − amount (cash only). Payment stored at the amount applied, not tendered.
- Shift expected cash = opening float + cash payments − withdrawals − staff_meal + deposits. Difference = counted − expected.
- Payments link to the shift open at payment time; payment requires an open shift.

## Split logic (`packages/shared/split.ts`)
Pure functions, return a list of `{payer_label, amount_cents, allocations?}` suggestions; UI then records each as a payment (any method):
- `equal(total, n)` — remainder cents go to first payers.
- `byAmount(amounts[])` — free amounts, last payer gets the rest.
- `byUnits(lines, picks)` — picks = `{line_id, qty}` per payer; fractions allowed (0.5 of a line).
- `byGoods(lines, assignment)` — whole lines per payer.
Unallocated remainder always visible. Covered by `bun test` (rounding, fractions, remainder).

## Printing
- `packages/shared/ticket.ts`: builds text layout for kitchen ticket (no prices, item notes, add-ons, `#<number> · <name> · <type>`, "UPDATED vN"/"CANCELADO") and customer bill (prices, payments, change, balance). Width param (32/48 chars).
- `apps/api/src/print/escpos.ts`: text → ESC/POS bytes (init, bold, cut). Few lines, no dependency.
- `adapter.ts`: setting `printer.mode` = `linux_device` (path) | `windows_share` (name) | `none`.
- Auto print kitchen ticket when order is created/edited (lines changed) → full reprint with version.
- Waitress app: "Imprimir" → Web Bluetooth (if supported + paired) else `POST /print/...`. Same bytes, fetched from API.

## Realtime
`GET /events` SSE: emits `order.updated {id, version}`. Kitchen screen and waitress order list refetch on event. No WebSocket lib.

## Phases
**Phase 1 — Core ordering + kitchen print**
Monorepo scaffold, DB + migrations, PIN login, admin menu CRUD (categories/items/variants/add-ons), staff CRUD, settings, waitress: new order (dine-in name / pickup / delivery), add lines with variant/add-ons/notes, edit, cancel; kitchen ticket print (USB adapters), i18n switch, PWA install.

**Phase 2 — Money**
Shifts (open/float/movements incl. staff meal/close with count), payments (mixed methods, change calc, pay-on-delivery + troco para), split (4 modes), reopen/edit closed orders, customer bill print, status flow (ready/out for delivery), audit log + admin viewer.

**Phase 3 — Extras**
Customer profiles (phone lookup while taking phone orders, addresses, history), reports (period/item/method/waitress, shift report), backups (auto + download), stock (admin stock screen + alerts, purchases/adjustments, waitress low-stock badges), kitchen screen `/kitchen` (SSE, mark ready), Web Bluetooth printing.

## Verification
- `bun test` in `packages/shared` (split math, totals, shift expected cash, ticket layout widths) and API route tests via `app.request()` against an in-memory SQLite.
- Manual: `bun run dev` (API + both apps), log in as waitress on a phone over LAN, create order → ticket prints (or `printer.mode=none` writes ticket text to console/file for dev), edit → reprint "UPDATED", pay split with cash+pix → change correct, close shift → expected cash matches. Stock: Coca Zero stock 20, sell 17 → screen shows 3 + alert (min 5); waitress sees "Restam 3"; cancel order → back to 20.
