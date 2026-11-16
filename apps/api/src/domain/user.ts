import type { Role } from "@ukemochi/shared";

export type User = {
	id: number;
	name: string;
	role: Role;
	active: boolean;
};
