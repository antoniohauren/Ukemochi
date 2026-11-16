import { afterEach, expect, test } from "bun:test";
import {
	act,
	cleanup,
	fireEvent,
	render,
	renderHook,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { createTestApp } from "@ukemochi/api/test-app";
import { createApiClient, I18nProvider } from "@ukemochi/ui";
import { MenuScreen } from "./MenuScreen";
import { useMenu } from "./useMenu";

afterEach(cleanup);

async function setup() {
	const { app, auth } = createTestApp();
	await auth.seedFirstAdmin("Ana", "1234");
	const api = createApiClient("http://api.test", { fetch: app.request });
	const res = await api.auth.login.$post({
		json: { name: "Ana", pin: "1234" },
	});
	if (res.status !== 200) throw new Error("login failed");
	localStorage.setItem("ukemochi.token", (await res.json()).token);
	return { api };
}

async function seedItem(api: Awaited<ReturnType<typeof setup>>["api"]) {
	const cat = await (
		await api.menu.categories.$post({ json: { name: "Rolls" } })
	).json();
	await api.menu.items.$post({
		json: {
			categoryId: cat.id,
			name: "Uramaki",
			variants: [
				{ name: "8un", priceCents: 3000 },
				{ name: "4un", priceCents: 1600 },
			],
		},
	});
}

async function menuOf(api: Awaited<ReturnType<typeof setup>>["api"]) {
	const res = await api.menu.$get();
	if (res.status !== 200) throw new Error("menu failed");
	return res.json();
}

function renderScreen(api: Awaited<ReturnType<typeof setup>>["api"]) {
	render(
		<I18nProvider>
			<MenuScreen api={api} />
		</I18nProvider>,
	);
}

const type = (label: string, value: string) =>
	fireEvent.change(screen.getByLabelText(label), { target: { value } });

test("creates a category from the dialog", async () => {
	const { api } = await setup();
	renderScreen(api);
	await screen.findByText("Nenhuma categoria ainda.");
	fireEvent.click(screen.getByRole("button", { name: "Adicionar categoria" }));
	const save = screen.getByRole("button", { name: "Salvar" });
	expect((save as HTMLButtonElement).disabled).toBe(true);
	type("Nome", "Temakis");
	fireEvent.click(save);
	await screen.findByRole("heading", { name: "Temakis" });
	expect(screen.queryByRole("dialog")).toBeNull();
});

test("creates an item with one default variant and its price", async () => {
	const { api } = await setup();
	await api.menu.categories.$post({ json: { name: "Temakis" } });
	renderScreen(api);
	fireEvent.click(
		await screen.findByRole("button", { name: "Adicionar item" }),
	);
	type("Nome", "Temaki salmão");
	type("Preço", "25,90");
	fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
	await screen.findByText("Padrão · R$ 25,90");
	const item = (await menuOf(api)).categories[0]?.items[0];
	expect(item).toMatchObject({
		name: "Temaki salmão",
		variants: [{ name: "", priceCents: 2590 }],
	});
});

test("toggles variant availability", async () => {
	const { api } = await setup();
	await seedItem(api);
	renderScreen(api);
	fireEvent.click(
		await screen.findByRole("switch", { name: "Disponível: Uramaki 8un" }),
	);
	await screen.findByText("Indisponível");
	const variants = (await menuOf(api)).categories[0]?.items[0]?.variants;
	expect(variants?.find((v) => v.name === "8un")?.available).toBe(false);
});

test("edits a variant price", async () => {
	const { api } = await setup();
	await seedItem(api);
	renderScreen(api);
	const row = (await screen.findByText(/^4un/)).closest("li");
	if (!row) throw new Error("row missing");
	fireEvent.click(within(row).getByRole("button", { name: "Editar" }));
	type("Preço", "18");
	fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
	await screen.findByText("4un · R$ 18,00");
});

test("cannot save a cleared or invalid price or a cleared sort", async () => {
	const { api } = await setup();
	await seedItem(api);
	renderScreen(api);
	const row = (await screen.findByText(/^4un/)).closest("li");
	if (!row) throw new Error("row missing");
	fireEvent.click(within(row).getByRole("button", { name: "Editar" }));
	const save = screen.getByRole("button", {
		name: "Salvar",
	}) as HTMLButtonElement;
	type("Preço", "abc");
	expect(save.disabled).toBe(true);
	type("Preço", "");
	expect(save.disabled).toBe(true);
	type("Preço", "16");
	expect(save.disabled).toBe(false);
	type("Ordem", "");
	expect(save.disabled).toBe(true);
});

test("edits the default variant without sending a name", async () => {
	const { api } = await setup();
	const cat = await (
		await api.menu.categories.$post({ json: { name: "Temakis" } })
	).json();
	await api.menu.items.$post({
		json: {
			categoryId: cat.id,
			name: "Temaki",
			variants: [{ name: "", priceCents: 2000 }],
		},
	});
	renderScreen(api);
	const row = (await screen.findByText(/^Padrão/)).closest("li");
	if (!row) throw new Error("row missing");
	fireEvent.click(within(row).getByRole("button", { name: "Editar" }));
	expect(screen.queryByLabelText("Nome")).toBeNull();
	type("Preço", "22");
	fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
	await screen.findByText("Padrão · R$ 22,00");
});

test("deletes a variant after confirmation", async () => {
	const { api } = await setup();
	await seedItem(api);
	renderScreen(api);
	const row = (await screen.findByText(/^4un/)).closest("li");
	if (!row) throw new Error("row missing");
	fireEvent.click(within(row).getByRole("button", { name: "Excluir" }));
	const dialog = screen.getByRole("dialog", {
		name: "Excluir variação Uramaki 4un?",
	});
	fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));
	await waitFor(() => expect(screen.queryByText(/^4un/)).toBeNull());
	// the item's last variant cannot be deleted
	const last = (await screen.findByText(/^8un/)).closest("li");
	if (!last) throw new Error("row missing");
	const del = within(last).getByRole("button", {
		name: "Excluir",
	}) as HTMLButtonElement;
	expect(del.disabled).toBe(true);
});

test("creates an add-on scoped to a category", async () => {
	const { api } = await setup();
	await seedItem(api);
	renderScreen(api);
	fireEvent.click(
		await screen.findByRole("button", { name: "Adicionar adicional" }),
	);
	type("Nome", "Cream cheese");
	type("Preço", "3");
	fireEvent.mouseDown(screen.getByRole("combobox", { name: "Vale para" }));
	fireEvent.click(await screen.findByRole("option", { name: "Rolls" }));
	fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
	await screen.findByText("Cream cheese · R$ 3,00");
	const menu = await menuOf(api);
	expect(menu.addons[0]).toMatchObject({
		name: "Cream cheese",
		priceCents: 300,
		categoryId: menu.categories[0]?.id,
		itemId: null,
	});
});

test("creates an add-on scoped to an item", async () => {
	const { api } = await setup();
	await seedItem(api);
	renderScreen(api);
	fireEvent.click(
		await screen.findByRole("button", { name: "Adicionar adicional" }),
	);
	type("Nome", "Gergelim");
	type("Preço", "1");
	fireEvent.mouseDown(screen.getByRole("combobox", { name: "Vale para" }));
	fireEvent.click(
		await screen.findByRole("option", { name: "Rolls · Uramaki" }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
	await screen.findByText("Gergelim · R$ 1,00");
	const menu = await menuOf(api);
	expect(menu.addons[0]).toMatchObject({
		itemId: menu.categories[0]?.items[0]?.id,
		categoryId: null,
	});
});

test("mutate returns an error key when the API refuses", async () => {
	const { api } = await setup();
	await seedItem(api);
	const { result } = renderHook(() => useMenu(api));
	await waitFor(() => expect(result.current.menu).not.toBeNull());
	const variants = result.current.menu?.categories[0]?.items[0]?.variants ?? [];
	let error: unknown;
	await act(async () => {
		for (const v of variants)
			error = await result.current.mutate(() =>
				api.menu.variants[":id"].$delete({ param: { id: String(v.id) } }),
			);
	});
	expect(error).toBe("menu.error.last_variant");
});
