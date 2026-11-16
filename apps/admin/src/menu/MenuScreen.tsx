import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import {
	addonCreateSchema,
	addonPatchSchema,
	categoryCreateSchema,
	categoryPatchSchema,
	formatMoney,
	itemCreateSchema,
	itemPatchSchema,
	type MessageKey,
	variantCreateSchema,
	variantPatchSchema,
} from "@ukemochi/shared";
import { type ApiClient, useI18n } from "@ukemochi/ui";
import { type ReactNode, useState } from "react";
import { z } from "zod";
import { type Field, MenuDialog } from "./MenuDialog";
import { type Menu, useMenu } from "./useMenu";

type Category = Menu["categories"][number];
type Item = Category["items"][number];
type Variant = Item["variants"][number];
type Addon = Menu["addons"][number];

const param = (record: { id: number }) => ({
	param: { id: String(record.id) },
});

/** Admin CRUD for categories, items, variants and add-ons. */
export function MenuScreen({ api }: { api: ApiClient }) {
	const { t, locale } = useI18n();
	const { menu, error, mutate } = useMenu(api);
	const [dialog, setDialog] = useState<ReactNode>(null);
	const [actionError, setActionError] = useState<MessageKey | null>(null);

	if (!menu)
		return error ? (
			<Alert severity="error">{t(error)}</Alert>
		) : (
			<CircularProgress aria-label={t("common.loading")} />
		);

	const close = () => setDialog(null);
	const run = async (call: Parameters<typeof mutate>[0]) =>
		setActionError(await mutate(call));
	const money = (cents: number) => formatMoney(cents, locale);

	const name: Field = { kind: "text", key: "name", label: t("common.name") };
	const note: Field = {
		kind: "text",
		key: "note",
		label: t("common.note"),
		multiline: true,
	};
	const sort: Field = { kind: "number", key: "sort", label: t("common.sort") };
	const price: Field = {
		kind: "money",
		key: "priceCents",
		label: t("common.price"),
	};
	const active: Field = {
		kind: "switch",
		key: "active",
		label: t("common.active"),
	};

	const addCategory = () =>
		setDialog(
			<MenuDialog
				title={t("menu.add_category")}
				fields={[name, sort, note]}
				schema={categoryCreateSchema}
				onSubmit={(json) => mutate(() => api.menu.categories.$post({ json }))}
				onClose={close}
			/>,
		);

	const editCategory = (c: Category) =>
		setDialog(
			<MenuDialog
				title={t("menu.edit_category")}
				fields={[name, sort, active, note]}
				initial={c}
				schema={categoryPatchSchema}
				onSubmit={(json) =>
					mutate(() => api.menu.categories[":id"].$patch({ ...param(c), json }))
				}
				onClose={close}
			/>,
		);

	const addItem = (c: Category) =>
		setDialog(
			<MenuDialog
				title={t("menu.add_item")}
				fields={[
					name,
					{ kind: "text", key: "variantName", label: t("menu.variant_name") },
					price,
					note,
				]}
				schema={itemCreateSchema}
				toInput={(v) => ({
					categoryId: c.id,
					name: v.name,
					note: v.note,
					variants: [{ name: v.variantName, priceCents: v.priceCents }],
				})}
				onSubmit={(json) => mutate(() => api.menu.items.$post({ json }))}
				onClose={close}
			/>,
		);

	const editItem = (item: Item) =>
		setDialog(
			<MenuDialog
				title={t("menu.edit_item")}
				fields={[
					name,
					{
						kind: "select",
						key: "categoryId",
						label: t("menu.category"),
						options: menu.categories.map((c) => ({
							value: c.id,
							label: c.name,
						})),
					},
					active,
					note,
				]}
				initial={item}
				schema={itemPatchSchema}
				onSubmit={(json) =>
					mutate(() => api.menu.items[":id"].$patch({ ...param(item), json }))
				}
				onClose={close}
			/>,
		);

	const addVariant = (item: Item) =>
		setDialog(
			<MenuDialog
				title={t("menu.add_variant")}
				fields={[name, price, sort, note]}
				schema={variantCreateSchema}
				onSubmit={(json) =>
					mutate(() =>
						api.menu.items[":id"].variants.$post({ ...param(item), json }),
					)
				}
				onClose={close}
			/>,
		);

	const editVariant = (v: Variant) =>
		setDialog(
			<MenuDialog
				title={t("menu.edit_variant")}
				// the default variant keeps its empty name; the schema needs one when sent
				fields={[
					...(v.name ? [name] : []),
					price,
					sort,
					{ kind: "switch", key: "available", label: t("menu.available") },
					note,
				]}
				initial={v}
				schema={variantPatchSchema}
				onSubmit={(json) =>
					mutate(() => api.menu.variants[":id"].$patch({ ...param(v), json }))
				}
				onClose={close}
			/>,
		);

	const deleteVariant = (item: Item, v: Variant) =>
		setDialog(
			<MenuDialog
				title={t("menu.delete_variant", {
					name: `${item.name} ${v.name}`.trim(),
				})}
				fields={[]}
				schema={z.object({})}
				submitLabel={t("common.delete")}
				onSubmit={() =>
					mutate(() => api.menu.variants[":id"].$delete(param(v)))
				}
				onClose={close}
			/>,
		);

	const scopeOptions = [
		{ value: "", label: t("menu.scope_all") },
		...menu.categories.flatMap((c) => [
			{ value: `c${c.id}`, label: c.name },
			...c.items.map((i) => ({
				value: `i${i.id}`,
				label: `${c.name} · ${i.name}`,
			})),
		]),
	];
	const scopeLabel = (a: Addon) =>
		scopeOptions.find(
			(o) =>
				o.value ===
				(a.itemId ? `i${a.itemId}` : a.categoryId ? `c${a.categoryId}` : ""),
		)?.label;

	const addAddon = () =>
		setDialog(
			<MenuDialog
				title={t("menu.add_addon")}
				fields={[
					name,
					price,
					{
						kind: "select",
						key: "scope",
						label: t("menu.addon_scope"),
						options: scopeOptions,
					},
					note,
				]}
				schema={addonCreateSchema}
				toInput={({ scope, ...v }) => {
					const id = typeof scope === "string" ? Number(scope.slice(1)) : 0;
					if (typeof scope === "string" && scope.startsWith("c"))
						return { ...v, categoryId: id };
					if (typeof scope === "string" && scope.startsWith("i"))
						return { ...v, itemId: id };
					return v;
				}}
				onSubmit={(json) => mutate(() => api.menu.addons.$post({ json }))}
				onClose={close}
			/>,
		);

	const editAddon = (a: Addon) =>
		setDialog(
			<MenuDialog
				title={t("menu.edit_addon")}
				fields={[name, price, active, note]}
				initial={a}
				schema={addonPatchSchema}
				onSubmit={(json) =>
					mutate(() => api.menu.addons[":id"].$patch({ ...param(a), json }))
				}
				onClose={close}
			/>,
		);

	const inactive = (
		<Chip component="span" size="small" label={t("common.inactive")} />
	);

	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
				<Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
					{t("menu.title")}
				</Typography>
				<Button variant="contained" onClick={addCategory}>
					{t("menu.add_category")}
				</Button>
			</Stack>
			{actionError && (
				<Alert severity="error" onClose={() => setActionError(null)}>
					{t(actionError)}
				</Alert>
			)}
			{menu.categories.length === 0 && (
				<Typography color="text.secondary">{t("menu.empty")}</Typography>
			)}
			{menu.categories.map((c) => (
				<Paper key={c.id} component="section" sx={{ p: 2 }}>
					<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
						<Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
							{c.name} {!c.active && inactive}
						</Typography>
						<Button onClick={() => editCategory(c)}>{t("common.edit")}</Button>
						<Button onClick={() => addItem(c)}>{t("menu.add_item")}</Button>
					</Stack>
					{c.note && <Typography color="text.secondary">{c.note}</Typography>}
					{c.items.map((item) => (
						<Box key={item.id} sx={{ mt: 2 }}>
							<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
								<Typography
									component="h4"
									sx={{ flexGrow: 1, fontWeight: 500 }}
								>
									{item.name} {!item.active && inactive}
								</Typography>
								<Button size="small" onClick={() => editItem(item)}>
									{t("common.edit")}
								</Button>
								<Button size="small" onClick={() => addVariant(item)}>
									{t("menu.add_variant")}
								</Button>
							</Stack>
							<List dense disablePadding>
								{item.variants.map((v) => (
									<ListItem
										key={v.id}
										secondaryAction={
											<Stack direction="row" sx={{ alignItems: "center" }}>
												<Switch
													checked={v.available}
													onChange={(e) =>
														run(() =>
															api.menu.variants[":id"].$patch({
																...param(v),
																json: { available: e.target.checked },
															}),
														)
													}
													slotProps={{
														input: {
															"aria-label":
																`${t("menu.available")}: ${item.name} ${v.name}`.trim(),
														},
													}}
												/>
												<Button size="small" onClick={() => editVariant(v)}>
													{t("common.edit")}
												</Button>
												<Button
													size="small"
													color="error"
													disabled={item.variants.length === 1}
													onClick={() => deleteVariant(item, v)}
												>
													{t("common.delete")}
												</Button>
											</Stack>
										}
										sx={{ pr: 28 }}
									>
										<ListItemText
											primary={`${v.name || t("menu.default_variant")} · ${money(v.priceCents)}`}
											secondary={v.available ? v.note : t("menu.unavailable")}
										/>
									</ListItem>
								))}
							</List>
						</Box>
					))}
				</Paper>
			))}
			<Paper component="section" sx={{ p: 2 }}>
				<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
					<Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
						{t("menu.addons")}
					</Typography>
					<Button onClick={addAddon}>{t("menu.add_addon")}</Button>
				</Stack>
				<List dense disablePadding>
					{menu.addons.map((a) => (
						<ListItem
							key={a.id}
							secondaryAction={
								<Button size="small" onClick={() => editAddon(a)}>
									{t("common.edit")}
								</Button>
							}
						>
							<ListItemText
								primary={
									<>
										{`${a.name} · ${money(a.priceCents)}`}{" "}
										{!a.active && inactive}
									</>
								}
								secondary={scopeLabel(a)}
							/>
						</ListItem>
					))}
				</List>
			</Paper>
			{dialog}
		</Stack>
	);
}
