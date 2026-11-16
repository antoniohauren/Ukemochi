import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import type { MessageKey } from "@ukemochi/shared";
import { MoneyInput, useI18n } from "@ukemochi/ui";
import { type FormEvent, useState } from "react";
import type { z } from "zod";

export type Field = { key: string; label: string } & (
	| { kind: "text"; multiline?: boolean }
	| { kind: "number" | "money" | "switch" }
	| { kind: "select"; options: { value: string | number; label: string }[] }
);

type Props<S extends z.ZodType> = {
	title: string;
	fields: Field[];
	initial?: Record<string, unknown>;
	schema: S;
	/** Maps the form values to the schema input; defaults to the values as they are. */
	toInput?: (values: Record<string, unknown>) => unknown;
	/** Returns an error key, or null to close the dialog. */
	onSubmit: (data: z.output<S>) => Promise<MessageKey | null>;
	onClose: () => void;
	submitLabel?: string;
};

function initialValue(field: Field, value: unknown): unknown {
	switch (field.kind) {
		case "text":
		case "number":
			return value === null || value === undefined ? "" : String(value);
		case "money":
			return value ?? null;
		case "switch":
			return Boolean(value);
		case "select":
			return value ?? "";
	}
}

/**
 * Form value to schema input. A blank optional field stays unset on create; clearing a saved
 * number, or bad money text, gives null so the schema rejects it instead of keeping the old value.
 */
function inputValue(field: Field, value: unknown, initial: unknown): unknown {
	if (field.kind === "number") {
		if (value !== "") return Number(value);
		return initial === null || initial === undefined ? undefined : null;
	}
	if (field.kind === "select") return value === "" ? undefined : value;
	return value;
}

/** Create/edit form for one menu record, validated with the shared zod schema. */
export function MenuDialog<S extends z.ZodType>({
	title,
	fields,
	initial = {},
	schema,
	toInput = (v) => v,
	onSubmit,
	onClose,
	submitLabel,
}: Props<S>) {
	const { t } = useI18n();
	const [values, setValues] = useState(() =>
		Object.fromEntries(
			fields.map((f) => [f.key, initialValue(f, initial[f.key])]),
		),
	);
	const [error, setError] = useState<MessageKey | null>(null);
	const [busy, setBusy] = useState(false);
	const set = (key: string, value: unknown) =>
		setValues((prev) => ({ ...prev, [key]: value }));

	const parsed = schema.safeParse(
		toInput(
			Object.fromEntries(
				fields.map((f) => [
					f.key,
					inputValue(f, values[f.key], initial[f.key]),
				]),
			),
		),
	);

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		if (!parsed.success || busy) return;
		setBusy(true);
		const err = await onSubmit(parsed.data);
		setBusy(false);
		if (err) setError(err);
		else onClose();
	};

	return (
		<Dialog open onClose={onClose} fullWidth maxWidth="xs">
			<form onSubmit={submit} noValidate>
				<DialogTitle>{title}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ pt: 1 }}>
						{fields.map((f) => {
							const value = values[f.key];
							switch (f.kind) {
								case "money":
									return (
										<MoneyInput
											key={f.key}
											label={f.label}
											value={value as number | null}
											onChange={(cents) => set(f.key, cents)}
										/>
									);
								case "switch":
									return (
										<FormControlLabel
											key={f.key}
											label={f.label}
											control={
												<Switch
													checked={value as boolean}
													onChange={(e) => set(f.key, e.target.checked)}
												/>
											}
										/>
									);
								case "select":
									return (
										<TextField
											key={f.key}
											select
											label={f.label}
											value={value}
											onChange={(e) => set(f.key, e.target.value)}
										>
											{f.options.map((o) => (
												<MenuItem key={o.value} value={o.value}>
													{o.label}
												</MenuItem>
											))}
										</TextField>
									);
								default:
									return (
										<TextField
											key={f.key}
											label={f.label}
											value={value}
											type={f.kind === "number" ? "number" : "text"}
											multiline={f.kind === "text" && f.multiline}
											onChange={(e) => set(f.key, e.target.value)}
										/>
									);
							}
						})}
						{error && <Alert severity="error">{t(error)}</Alert>}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose}>{t("common.cancel")}</Button>
					<Button
						type="submit"
						variant="contained"
						disabled={!parsed.success || busy}
					>
						{submitLabel ?? t("common.save")}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
}
