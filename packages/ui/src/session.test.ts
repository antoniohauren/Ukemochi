import { expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createTestApp } from "@ukemochi/api/test-app";
import { createApiClient, useSession } from "./session";

async function setup() {
	const { app, auth } = createTestApp();
	await auth.seedFirstAdmin("Ana", "1234");
	const api = createApiClient("http://api.test", {
		fetch: app.request,
	});
	return { api };
}

test("starts anonymous without a saved token", async () => {
	const { api } = await setup();
	const { result } = renderHook(() => useSession(api));
	expect(result.current.session.status).toBe("anonymous");
});

test("logs in, saves the token and restores the session on reload", async () => {
	const { api } = await setup();
	const first = renderHook(() => useSession(api));
	let error: unknown;
	await act(async () => {
		error = await first.result.current.login("Ana", "1234");
	});
	expect(error).toBeNull();
	expect(first.result.current.session).toMatchObject({
		status: "authenticated",
		user: { name: "Ana", role: "admin" },
	});
	first.unmount();

	const second = renderHook(() => useSession(api));
	expect(second.result.current.session.status).toBe("loading");
	await waitFor(() =>
		expect(second.result.current.session.status).toBe("authenticated"),
	);
});

test("returns an error key for a wrong PIN", async () => {
	const { api } = await setup();
	const { result } = renderHook(() => useSession(api));
	let error: unknown;
	await act(async () => {
		error = await result.current.login("Ana", "0000");
	});
	expect(error).toBe("auth.invalid_credentials");
	expect(result.current.session.status).toBe("anonymous");
});

test("returns an error key when locked out", async () => {
	const { api } = await setup();
	const { result } = renderHook(() => useSession(api));
	let error: unknown;
	await act(async () => {
		for (let i = 0; i < 6; i++)
			error = await result.current.login("Ana", "0000");
	});
	expect(error).toBe("auth.too_many_attempts");
});

test("returns a generic error when the network fails", async () => {
	const api = createApiClient("http://api.test", {
		fetch: () => Promise.reject(new Error("offline")),
	});
	const { result } = renderHook(() => useSession(api));
	let error: unknown;
	await act(async () => {
		error = await result.current.login("Ana", "1234");
	});
	expect(error).toBe("error.generic");
});

test("drops an expired token on reload", async () => {
	const { api } = await setup();
	localStorage.setItem("ukemochi.token", "stale");
	const { result } = renderHook(() => useSession(api));
	await waitFor(() => expect(result.current.session.status).toBe("anonymous"));
	expect(localStorage.getItem("ukemochi.token")).toBeNull();
});

test("logout revokes the token on the server and clears it", async () => {
	const { api } = await setup();
	const { result } = renderHook(() => useSession(api));
	await act(async () => {
		await result.current.login("Ana", "1234");
	});
	const token = localStorage.getItem("ukemochi.token");
	expect(token).not.toBeNull();
	await act(async () => {
		await result.current.logout();
	});
	expect(result.current.session.status).toBe("anonymous");
	expect(localStorage.getItem("ukemochi.token")).toBeNull();
	localStorage.setItem("ukemochi.token", token ?? "");
	expect((await api.auth.me.$get()).status).toBe(401);
});

test("logout clears the session even when the server is unreachable", async () => {
	localStorage.setItem("ukemochi.token", "saved");
	const api = createApiClient("http://api.test", {
		fetch: () => Promise.reject(new Error("offline")),
	});
	const { result } = renderHook(() => useSession(api));
	await act(async () => {
		await result.current.logout();
	});
	expect(result.current.session.status).toBe("anonymous");
	expect(localStorage.getItem("ukemochi.token")).toBeNull();
});

test("keeps the token when the server errors on reload", async () => {
	localStorage.setItem("ukemochi.token", "saved");
	const api = createApiClient("http://api.test", {
		fetch: () => new Response("{}", { status: 500 }),
	});
	const { result } = renderHook(() => useSession(api));
	await waitFor(() => expect(result.current.session.status).toBe("anonymous"));
	expect(localStorage.getItem("ukemochi.token")).toBe("saved");
});
