export const LOCALES = ["pt-BR", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const en = {
	"app.name": "Ukemochi",
	"common.save": "Save",
	"common.cancel": "Cancel",
	"common.delete": "Delete",
	"common.edit": "Edit",
	"common.confirm": "Confirm",
	"common.note": "Note",
	"common.loading": "Loading",
	"auth.login": "Log in",
	"auth.logout": "Log out",
	"auth.name": "Name",
	"auth.pin": "PIN",
	"auth.welcome": "Welcome, {name}",
	"auth.invalid_credentials": "Wrong name or PIN",
	"auth.too_many_attempts": "Too many attempts. Wait a minute and try again.",
	"settings.language": "Language",
	"error.generic": "Something went wrong. Try again.",
} as const;

export type MessageKey = keyof typeof en;

const ptBR: Record<MessageKey, string> = {
	"app.name": "Ukemochi",
	"common.save": "Salvar",
	"common.cancel": "Cancelar",
	"common.delete": "Excluir",
	"common.edit": "Editar",
	"common.confirm": "Confirmar",
	"common.note": "Observação",
	"common.loading": "Carregando",
	"auth.login": "Entrar",
	"auth.logout": "Sair",
	"auth.name": "Nome",
	"auth.pin": "PIN",
	"auth.welcome": "Bem-vinda(o), {name}",
	"auth.invalid_credentials": "Nome ou PIN incorreto",
	"auth.too_many_attempts":
		"Muitas tentativas. Aguarde um minuto e tente novamente.",
	"settings.language": "Idioma",
	"error.generic": "Algo deu errado. Tente novamente.",
};

export const dictionaries: Record<Locale, Record<MessageKey, string>> = {
	"pt-BR": ptBR,
	en,
};

/** Looks up a message and replaces `{var}` placeholders. */
export function t(
	locale: Locale,
	key: MessageKey,
	vars?: Record<string, string | number>,
): string {
	const message = dictionaries[locale][key];
	if (!vars) return message;
	return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
		name in vars ? String(vars[name]) : whole,
	);
}
