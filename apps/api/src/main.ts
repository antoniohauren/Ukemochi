import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./http/app";
import { migrate, openDb } from "./infrastructure/db";

const dbPath = Bun.env.DB_PATH ?? "data/ukemochi.sqlite";
const port = Number(Bun.env.PORT ?? 3000);

mkdirSync(dirname(dbPath), { recursive: true });
const db = openDb(dbPath);
const applied = migrate(db);
if (applied.length) console.log(`migrations applied: ${applied.join(", ")}`);

const server = Bun.serve({ port, fetch: createApp().fetch });
console.log(`api listening on ${server.url}`);
