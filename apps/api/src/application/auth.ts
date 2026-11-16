import { DomainError } from "../domain/errors";
import type { User } from "../domain/user";
import type {
	Clock,
	PinHasher,
	SessionRepository,
	UserRepository,
} from "./ports";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 60_000;
/** Absolute session lifetime; staff log in again with their PIN after it. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type Deps = {
	users: UserRepository;
	sessions: SessionRepository;
	hasher: PinHasher;
	clock: Clock;
};

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService({ users, sessions, hasher, clock }: Deps) {
	// shortcut: lockout state is in memory, resets on restart; fine for one LAN server.
	const failures = new Map<string, { count: number; lockedUntil: number }>();
	let dummyHash: Promise<string> | undefined;

	return {
		/** Returns a new session token. Locks a name for LOCKOUT_MS after MAX_FAILED_LOGINS bad PINs. */
		async login(
			name: string,
			pin: string,
		): Promise<{ token: string; user: User }> {
			const key = name.toLowerCase();
			const now = clock.now().getTime();
			const entry = failures.get(key);
			if (entry && entry.lockedUntil > now) {
				throw new DomainError("rate_limited", "too many failed attempts");
			}
			// Count the attempt before awaiting, so parallel requests cannot all pass the lock check.
			// An expired lock starts a fresh count.
			const count = (entry?.lockedUntil === 0 ? entry.count : 0) + 1;
			if (failures.size > 1000) {
				// Bound memory against random names; keep active locks.
				for (const [k, v] of failures)
					if (v.lockedUntil <= now) failures.delete(k);
			}
			failures.set(key, {
				count,
				lockedUntil: count >= MAX_FAILED_LOGINS ? now + LOCKOUT_MS : 0,
			});
			const found = users.findByName(name);
			// Verify against a dummy hash for unknown names so timing does not reveal them.
			dummyHash ??= hasher.hash("0000");
			const ok = await hasher.verify(pin, found?.pinHash ?? (await dummyHash));
			if (!found || !ok || !found.active) {
				throw new DomainError("unauthorized", "invalid name or PIN");
			}
			failures.delete(key);
			const token = newToken();
			sessions.create(token, found.id, clock.now());
			const { pinHash: _, ...user } = found;
			return { token, user };
		},

		logout(token: string): void {
			sessions.delete(token);
		},

		/** User for a session token, or null when the token is unknown, expired or the user is inactive. */
		authenticate(token: string): User | null {
			const session = sessions.find(token);
			if (!session) return null;
			if (
				clock.now().getTime() - session.createdAt.getTime() >=
				SESSION_TTL_MS
			) {
				sessions.delete(token);
				return null;
			}
			const user = users.findById(session.userId);
			return user?.active ? user : null;
		},

		/** Creates the first admin when there are no users. Returns it, or null if users exist. */
		async seedFirstAdmin(name: string, pin: string): Promise<User | null> {
			if (users.count() > 0) return null;
			return users.create({
				name,
				pinHash: await hasher.hash(pin),
				role: "admin",
			});
		},
	};
}

function newToken(): string {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
		"base64url",
	);
}
