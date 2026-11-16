export type DomainErrorCode =
	| "not_found"
	| "invalid"
	| "conflict"
	| "unauthorized"
	| "forbidden"
	| "rate_limited";

/** Expected business failure; the HTTP layer maps `code` to a status. */
export class DomainError extends Error {
	constructor(
		readonly code: DomainErrorCode,
		message: string,
	) {
		super(message);
		this.name = "DomainError";
	}
}
