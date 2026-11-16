import type { Role } from "@ukemochi/shared";
import type { User } from "../domain/user";

export type Clock = { now(): Date };

export type PinHasher = {
	hash(pin: string): Promise<string>;
	verify(pin: string, hash: string): Promise<boolean>;
};

export type UserRepository = {
	count(): number;
	findById(id: number): User | null;
	/** Case-insensitive name lookup, includes the stored PIN hash. */
	findByName(name: string): (User & { pinHash: string }) | null;
	create(input: { name: string; pinHash: string; role: Role }): User;
};

export type SessionRepository = {
	create(token: string, userId: number, createdAt: Date): void;
	find(token: string): { userId: number; createdAt: Date } | null;
	delete(token: string): void;
};
