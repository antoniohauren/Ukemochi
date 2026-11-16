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
	"common.name": "Name",
	"common.active": "Active",
	"common.inactive": "Inactive",
	"common.sort": "Order",
	"common.price": "Price",
	"settings.language": "Language",
	"menu.title": "Menu",
	"menu.category": "Category",
	"menu.add_category": "Add category",
	"menu.edit_category": "Edit category",
	"menu.add_item": "Add item",
	"menu.edit_item": "Edit item",
	"menu.add_variant": "Add variant",
	"menu.edit_variant": "Edit variant",
	"menu.delete_variant": "Delete variant {name}?",
	"menu.variant_name": "Variant (optional)",
	"menu.default_variant": "Default",
	"menu.available": "Available",
	"menu.unavailable": "Unavailable",
	"menu.addons": "Add-ons",
	"menu.add_addon": "Add add-on",
	"menu.edit_addon": "Edit add-on",
	"menu.addon_scope": "Applies to",
	"menu.scope_all": "All items",
	"menu.empty": "No categories yet.",
	"menu.error.last_variant": "An item needs at least one variant.",
	"error.generic": "Something went wrong. Try again.",
	"error.forbidden": "Only admins can do this.",
	"error.invalid": "Check the fields and try again.",
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
	"common.name": "Nome",
	"common.active": "Ativo",
	"common.inactive": "Inativo",
	"common.sort": "Ordem",
	"common.price": "Preço",
	"settings.language": "Idioma",
	"menu.title": "Cardápio",
	"menu.category": "Categoria",
	"menu.add_category": "Adicionar categoria",
	"menu.edit_category": "Editar categoria",
	"menu.add_item": "Adicionar item",
	"menu.edit_item": "Editar item",
	"menu.add_variant": "Adicionar variação",
	"menu.edit_variant": "Editar variação",
	"menu.delete_variant": "Excluir variação {name}?",
	"menu.variant_name": "Variação (opcional)",
	"menu.default_variant": "Padrão",
	"menu.available": "Disponível",
	"menu.unavailable": "Indisponível",
	"menu.addons": "Adicionais",
	"menu.add_addon": "Adicionar adicional",
	"menu.edit_addon": "Editar adicional",
	"menu.addon_scope": "Vale para",
	"menu.scope_all": "Todos os itens",
	"menu.empty": "Nenhuma categoria ainda.",
	"menu.error.last_variant": "Um item precisa de pelo menos uma variação.",
	"error.generic": "Algo deu errado. Tente novamente.",
	"error.forbidden": "Só administradores podem fazer isso.",
	"error.invalid": "Confira os campos e tente novamente.",
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
