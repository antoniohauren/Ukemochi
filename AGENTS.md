# AGENTS.md — Ukemochi

Guide for AI agents and humans working in this repo. Product scope and step list live in `PLAN.md`.

## Stack
- API: **Laravel** (PHP 8.4+), **PostgreSQL**, auth with **Sanctum** tokens, realtime with **Reverb**.
- Frontends: **Angular** PWAs in one workspace (`frontend/projects/admin`, `frontend/projects/waitress`), shared library `frontend/projects/shared`.
- UI: **Angular Material** (docs: https://material.angular.dev/) for components, layout and theming.
- Everything runs in **Docker Compose**. No PHP, Node or Postgres needed on the host besides Docker.
- Lint/format: **Pint** + **Larastan** (PHPStan, max level) for PHP; **ESLint** (angular-eslint) + **Prettier** for TS. TypeScript `strict: true`, no `any`. PHP `declare(strict_types=1)` in every file.

## Commands
```
make dev      # docker compose up: postgres, api, reverb, scheduler, web (+ ng serve for both apps)
make test     # php artisan test + ng test (all projects)
make check    # pint --test, phpstan, eslint, tsc --noEmit
```
Run one-off commands inside containers (`docker compose exec api php artisan ...`), not on the host.
A step is not done until `make test` and `make check` pass.

## Clean architecture (api/)
```
app/Domain/          entities, value objects (Money), enums, pure rules
app/Application/     use cases + ports (interfaces)
app/Infrastructure/  Eloquent models + repositories, printer, ESC/POS, backup, clock
app/Http/            controllers, FormRequests, API Resources, middleware
app/Providers/       composition root (the only place that binds ports to concrete classes)
```
Dependency rule: imports point inward only. `Http → Application → Domain`; `Infrastructure → Application/Domain`.
- `Domain` is plain PHP: no `Illuminate\*`, no Eloquent, no facades, no `now()`; take time as an argument.
- `Application` depends on ports (e.g. `OrderRepository`, `Printer`, `Clock`, `AuditLog`), never on Eloquent or facades.
- Eloquent models live in `Infrastructure` only and never leave it; repositories map them to domain entities.
- Controllers are thin: a FormRequest validates, call one use case, return an API Resource.
- Use `final` classes, `readonly` properties, constructor injection, backed enums for statuses. Bind ports in one service provider; no service locator (`app()`, `resolve()`) outside providers.
- Errors: domain throws typed `DomainException` subclasses with a code. One handler in `bootstrap/app.php` (`withExceptions`) maps them to HTTP status + `{code, message}`. Frontends translate by `code`.

Frontends: keep components thin. Logic goes in services or `shared`. Presentational components in `shared` take `input()`s and emit `output()`s, no `HttpClient`.

## TDD workflow
1. Write a failing test for the next behavior (red).
2. Write the minimum code to pass (green).
3. Refactor with tests green.
Rules:
- Tests use **Pest** on the API, Angular's default unit test runner on the frontends.
- Domain and application: unit tests (`tests/Unit/...`, mirroring `app/`) with in-memory fakes for ports. Cover edge cases (rounding, fractions, negative stock, reopen).
- HTTP: feature tests (`tests/Feature/...`) through `$this->postJson()` etc. against the Postgres test database with `RefreshDatabase`. No SQLite: behavior must match production Postgres.
- Infrastructure: repository tests against the test database; printer adapters against a temp file.
- Angular: test services, pipes and logic; components only where behavior matters (`TestBed` + Angular CDK test harnesses for Material). Specs sit next to code: `foo.ts` + `foo.spec.ts`.
- Name tests by behavior: `it('closes order when paid in full')`.
- Bug fix = failing test that reproduces it first.

## Laravel
- Use what Laravel ships first: `Hash` (PIN hash), `RateLimiter`, Sanctum, Reverb, scheduler, `Storage`, `Process`. Do not add a package for something the framework already does.
- Every route under `routes/api.php` (`/api/*`). Validate every body, query and route param with a FormRequest. The HTTP layer is the trust boundary.
- Auth via `auth:sanctum`; role checks as middleware per route group.
- Responses through API Resources only, so the JSON shape is defined in one place.
- Broadcast events implement `ShouldBroadcastNow` (no queue worker). Channel auth in `routes/channels.php`.

## PostgreSQL
- Schema changes only through new Laravel migrations. Never edit an applied migration.
- Money columns `bigint` (cents), times `timestamptz`, audit summaries `jsonb`. Enum-like columns `text` + `CHECK`. Real foreign keys.
- Query builder / Eloquent with bound parameters only. Never interpolate input into `DB::raw` / `whereRaw`.
- Multi-table writes (order + lines + stock + audit) run in one `DB::transaction`.

## Angular
- Standalone components, signals, `ChangeDetectionStrategy.OnPush`, built-in control flow (`@if`, `@for`), `inject()`.
- Styling through Angular Material only: one shared theme in `shared` (Material tokens), component-scoped SCSS for small overrides that use theme tokens. No other CSS framework, no inline `style` attributes.
- Prefer Material components (`mat-button`, `mat-form-field`, `mat-dialog`, `mat-list`...) over hand-rolled ones; wrap in `shared` only when adding app-specific behavior (NumPad, MoneyInput).
- Server state through the typed `ApiClient` service in `shared` (`HttpClient` + auth interceptor). No NgRx unless needed.
- Forms: typed reactive forms; validation mirrors the API's FormRequest rules, the API stays authoritative.
- Mobile first for `waitress`: big touch targets, works at 360px width.
- Accessibility: real `<button>`/`<label>`, visible focus, no click handlers on non-interactive elements.
- All user-visible text through `t`. Keys exist in both `pt-BR` and `en` dictionaries (the `en` dictionary is typed from the `pt-BR` keys).

## Domain conventions
- Money is integer cents everywhere (PHP `int`, TS `number`). Format only at the UI edge with `Intl.NumberFormat`.
- Business math (totals, split, shift cash, ticket layout) lives once, in `app/Domain`. Frontends show what the API computes.
- Order lines snapshot item name, variant name and price at the time of sale.
- Every mutable record has an optional `note`. Every mutation writes an `audit_log` row (who, when, what).
- Order number is global sequential and never resets.
- The app never blocks staff: stock can go negative, warnings instead of errors.

## Step workflow (per step in PLAN.md)
1. Read the step and the code it touches.
2. TDD the slice until `make test` and `make check` pass.
3. Spawn a review subagent (code-review / reviewer agent) on the step's diff. Ask for correctness, security, layer violations, missing tests.
4. Fix every confirmed finding, test first where it is a bug. Re-run tests and check.
5. Tick the step in `PLAN.md`. Commit with a Conventional Commit message (`feat(orders): ...`).

## Do not
- Put business rules in controllers, Eloquent models or Angular components.
- Import `Infrastructure` (or Eloquent, or facades) from `Domain` or `Application`.
- Use floats for money.
- Skip validation, error handling that prevents data loss, or the audit log.
- Add features not in `PLAN.md` without asking.
