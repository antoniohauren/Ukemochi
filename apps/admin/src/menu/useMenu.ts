import type { MessageKey } from "@ukemochi/shared";
import type { ApiClient } from "@ukemochi/ui";
import type { InferResponseType } from "hono/client";
import { useCallback, useEffect, useState } from "react";

export type Menu = InferResponseType<ApiClient["menu"]["$get"], 200>;

const ERRORS: Partial<Record<number, MessageKey>> = {
	400: "error.invalid",
	403: "error.forbidden",
	409: "menu.error.last_variant",
};

const errorKey = (status: number): MessageKey =>
	ERRORS[status] ?? "error.generic";

/** Menu tree from the API plus a helper that runs one write and reloads. */
export function useMenu(api: ApiClient) {
	const [menu, setMenu] = useState<Menu | null>(null);
	const [error, setError] = useState<MessageKey | null>(null);

	const reload = useCallback(async () => {
		try {
			const res = await api.menu.$get();
			if (res.status !== 200) return setError(errorKey(res.status));
			setMenu(await res.json());
			setError(null);
		} catch {
			setError("error.generic");
		}
	}, [api]);

	useEffect(() => {
		void reload();
	}, [reload]);

	/** Returns an error key, or null on success. */
	const mutate = useCallback(
		async (
			call: () => Promise<{ ok: boolean; status: number }>,
		): Promise<MessageKey | null> => {
			try {
				const res = await call();
				if (!res.ok) return errorKey(res.status);
			} catch {
				return "error.generic";
			}
			await reload();
			return null;
		},
		[reload],
	);

	return { menu, error, mutate };
}
