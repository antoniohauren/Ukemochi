import type { AppType } from "@ukemochi/api";
import type { MessageKey } from "@ukemochi/shared";
import {
	type ClientRequestOptions,
	hc,
	type InferResponseType,
} from "hono/client";
import { useCallback, useEffect, useState } from "react";

const TOKEN_KEY = "ukemochi.token";
/** A hung `/auth/me` on bad Wi-Fi falls back to the login screen. */
const ME_TIMEOUT_MS = 5000;

function readToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

function writeToken(token: string | null) {
	try {
		if (token) localStorage.setItem(TOKEN_KEY, token);
		else localStorage.removeItem(TOKEN_KEY);
	} catch {}
}

/** Typed API client. Sends the saved session token on every request. */
export function createApiClient(
	baseUrl: string,
	options: Pick<ClientRequestOptions, "fetch"> = {},
) {
	return hc<AppType>(baseUrl, {
		fetch: options.fetch,
		headers: (): Record<string, string> => {
			const token = readToken();
			return token ? { authorization: `Bearer ${token}` } : {};
		},
	});
}

export type ApiClient = ReturnType<typeof createApiClient>;
export type SessionUser = InferResponseType<
	ApiClient["auth"]["me"]["$get"],
	200
>;

export type Session =
	| { status: "loading" }
	| { status: "anonymous" }
	| { status: "authenticated"; user: SessionUser };

const LOGIN_ERRORS: Partial<Record<number, MessageKey>> = {
	401: "auth.invalid_credentials",
	429: "auth.too_many_attempts",
};

/** Login state. Restores a saved token on mount via `/auth/me`. */
export function useSession(api: ApiClient) {
	const [session, setSession] = useState<Session>(() =>
		readToken() ? { status: "loading" } : { status: "anonymous" },
	);

	useEffect(() => {
		if (!readToken()) return;
		let active = true;
		api.auth.me
			.$get(undefined, {
				init: { signal: AbortSignal.timeout(ME_TIMEOUT_MS) },
			})
			.then(async (res) => {
				if (!active) return;
				if (res.status === 200) {
					setSession({ status: "authenticated", user: await res.json() });
					return;
				}
				if (res.status === 401) writeToken(null);
				setSession({ status: "anonymous" });
			})
			.catch(() => active && setSession({ status: "anonymous" }));
		return () => {
			active = false;
		};
	}, [api]);

	/** Returns an error message key, or null on success. */
	const login = useCallback(
		async (name: string, pin: string): Promise<MessageKey | null> => {
			try {
				const res = await api.auth.login.$post({ json: { name, pin } });
				if (res.status !== 200)
					return LOGIN_ERRORS[res.status] ?? "error.generic";
				const { token, user } = await res.json();
				writeToken(token);
				setSession({ status: "authenticated", user });
				return null;
			} catch {
				return "error.generic";
			}
		},
		[api],
	);

	/** Logs out locally at once; revokes the token on the server in the background. */
	const logout = useCallback(() => {
		const token = readToken();
		writeToken(null);
		setSession({ status: "anonymous" });
		if (!token) return Promise.resolve();
		// shortcut: no retry if offline; the server session then lives until SESSION_TTL_MS.
		return api.auth.logout
			.$post(undefined, { headers: { authorization: `Bearer ${token}` } })
			.then(
				() => {},
				() => {},
			);
	}, [api]);

	return { session, login, logout };
}
