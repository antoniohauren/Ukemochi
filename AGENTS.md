# AGENTS.md — Ukemochi

Guide for AI agents and humans working in this repo. Product scope and step list live in `PLAN.md`.

## Stack
- Runtime, package manager, test runner: **Bun** (workspaces). No Node, npm, Jest or Vitest.
- API: **Hono** on Bun, **SQLite** via `bun:sqlite`, validation with `zod` + `@hono/zod-validator`.
- Frontends: **React** + **Vite** PWAs (`apps/admin`, `apps/waitress`). No React Native.
- Shared: `packages/shared` (pure TS: types, schemas, money, i18n, split, tickets), `packages/ui` (React components).
- Lint/format: **Biome**. TypeScript `strict: true`, no `any`.

## Commands
```
bun install
bun run dev      # API + both apps
bun test         # all tests
bun run check    # biome + tsc --noEmit
```
A step is not done until `bun test` and `bun run check` pass.

## Clean architecture (apps/api)
```
src/domain/          entities, value objects, pure rules
src/application/     use cases + ports (interfaces)
src/infrastructure/  sqlite repos, printer, backup, clock
src/http/            Hono routes, validators, middleware, SSE
src/main.ts          composition root (the only place that wires concrete classes)
```
Dependency rule: imports point inward only. `http → application → domain`; `infrastructure → application/domain`.
- `domain` imports nothing outside itself (no Hono, no SQLite, no `Date.now()`; take time as an argument).
- `application` depends on ports (e.g. `OrderRepository`, `Printer`, `Clock`), never on concrete infra.
- `http` handlers are thin: parse + validate input, call one use case, map result to a response.
- Shared pure logic both API and frontends need (money, split, ticket layout) lives in `packages/shared`.
- Use plain functions and object literals that satisfy an interface. No classes unless state needs them. No DI container.
- Errors: domain returns typed results or throws domain errors. One Hono `onError` maps them to HTTP status.

Frontends: keep screens thin. Logic goes in hooks or `packages/shared`. Components in `packages/ui` are presentational only (props in, events out, no fetch).

## TDD workflow
1. Write a failing test for the next behavior (`bun test` red).
2. Write the minimum code to pass (green).
3. Refactor with tests green.
Rules:
- Domain and application: unit tests with in-memory fakes for ports. Cover edge cases (rounding, fractions, negative stock, reopen).
- HTTP: test through `app.request()` against an in-memory SQLite (`:memory:`) with migrations applied. No real network.
- Infrastructure: test sqlite repos against `:memory:`; printer adapters against a temp file.
- React: test hooks and logic; components only where behavior matters. Use `bun test` + `happy-dom` + Testing Library.
- Tests sit next to code: `foo.ts` + `foo.test.ts`. Name tests by behavior: `"closes order when paid in full"`.
- Bug fix = failing test that reproduces it first.

## Bun
- Use built-ins first: `bun:sqlite`, `Bun.password` (PIN hash), `Bun.file`/`Bun.write`, `bun test`, `Bun.env`.
- Do not add a dependency for something Bun or the standard library already does.
- Workspace imports via package names (`@ukemochi/shared`), not relative paths across packages.

## Hono
- Chain routes so types flow: `const app = new Hono().route('/orders', orders)`. Export `type AppType = typeof app`.
- Frontends call the API only through `hc<AppType>` from `hono/client`.
- Validate every request body, query and param with `zValidator`. The HTTP layer is the trust boundary.
- Auth via middleware that sets `c.var.user`; role checks as middleware per route group.
- Realtime via `streamSSE`. No WebSocket library.

## SQLite
- Schema changes only through new files in `apps/api/migrations/NNN_name.sql`. Never edit an applied migration.
- Enable `PRAGMA journal_mode = WAL` and `foreign_keys = ON`.
- Use prepared statements with bound parameters. Never build SQL with string concatenation of input.
- Multi-table writes (order + lines + stock + audit) run in one `db.transaction`.

## React
- Function components + hooks. Server state through a small `useApi` hook around `hc`; no global store unless needed.
- Forms: controlled inputs, validate with the shared zod schemas.
- Mobile first for `apps/waitress`: big touch targets, works at 360px width.
- Accessibility: real `<button>`/`<label>`, visible focus, no click handlers on divs.
- All user-visible text through `t()`. Keys exist in both `pt-BR` and `en` dictionaries.

## Domain conventions
- Money is integer cents (`number`) everywhere. Format only at the UI edge with `Intl.NumberFormat`.
- Order lines snapshot item name, variant name and price at the time of sale.
- Every mutable record has an optional `note`. Every mutation writes an `audit_log` row (who, when, what).
- Order number is global sequential and never resets.
- The app never blocks staff: stock can go negative, warnings instead of errors.

## Step workflow (per step in PLAN.md)
1. Read the step and the code it touches.
2. TDD the slice until `bun test` and `bun run check` pass.
3. Spawn a review subagent (code-review / reviewer agent) on the step's diff. Ask for correctness, security, layer violations, missing tests.
4. Fix every confirmed finding, test first where it is a bug. Re-run tests and check.
5. Tick the step in `PLAN.md`. Commit with a Conventional Commit message (`feat(orders): ...`).

## Do not
- Put business rules in Hono handlers or React components.
- Import `infrastructure` from `domain` or `application`.
- Use floats for money.
- Skip validation, error handling that prevents data loss, or the audit log.
- Add features not in `PLAN.md` without asking.
