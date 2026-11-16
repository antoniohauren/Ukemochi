import type { Database } from "bun:sqlite";
import type { Role } from "@ukemochi/shared";
import type {
	Clock,
	PinHasher,
	SessionRepository,
	UserRepository,
} from "../application/ports";
import type { User } from "../domain/user";

type UserRow = {
	id: number;
	name: string;
	role: Role;
	active: number;
	pin_hash: string;
};

const toUser = (r: UserRow): User => ({
	id: r.id,
	name: r.name,
	role: r.role,
	active: r.active === 1,
});

export function createSqliteUserRepository(db: Database): UserRepository {
	const count = db.query<{ n: number }, []>("SELECT count(*) AS n FROM users");
	const byId = db.query<UserRow, [number]>("SELECT * FROM users WHERE id = ?");
	const byName = db.query<UserRow, [string]>(
		"SELECT * FROM users WHERE name = ?",
	);
	const insert = db.query<UserRow, [string, string, Role]>(
		"INSERT INTO users (name, pin_hash, role) VALUES (?, ?, ?) RETURNING *",
	);
	return {
		count: () => count.get()?.n ?? 0,
		findById(id) {
			const r = byId.get(id);
			return r ? toUser(r) : null;
		},
		findByName(name) {
			const r = byName.get(name);
			return r ? { ...toUser(r), pinHash: r.pin_hash } : null;
		},
		create({ name, pinHash, role }) {
			const r = insert.get(name, pinHash, role);
			if (!r) throw new Error("user insert returned no row");
			return toUser(r);
		},
	};
}

export function createSqliteSessionRepository(db: Database): SessionRepository {
	const insert = db.query<never, [string, number, string]>(
		"INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
	);
	const find = db.query<{ user_id: number; created_at: string }, [string]>(
		"SELECT user_id, created_at FROM sessions WHERE token = ?",
	);
	const remove = db.query<never, [string]>(
		"DELETE FROM sessions WHERE token = ?",
	);
	return {
		create: (token, userId, createdAt) =>
			void insert.run(hashToken(token), userId, createdAt.toISOString()),
		find(token) {
			const r = find.get(hashToken(token));
			return r
				? { userId: r.user_id, createdAt: new Date(r.created_at) }
				: null;
		},
		delete: (token) => void remove.run(hashToken(token)),
	};
}

/** Sessions store sha256(token), so a DB copy holds no usable tokens. */
export const hashToken = (token: string) =>
	new Bun.CryptoHasher("sha256").update(token).digest("hex");

export const bunPinHasher: PinHasher = {
	hash: (pin) => Bun.password.hash(pin),
	verify: (pin, hash) => Bun.password.verify(pin, hash),
};

export const systemClock: Clock = { now: () => new Date() };
