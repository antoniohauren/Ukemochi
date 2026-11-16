/** Source dictionary. Every other language must define exactly these keys. */
export const ptBR = {
  'lang.pt-BR': 'Português',
  'lang.en': 'English',
  'common.save': 'Salvar',
  'common.cancel': 'Cancelar',
  'error.unknown': 'Algo deu errado. Tente novamente.',
  'error.network': 'Sem conexão com o servidor.',
  'error.money.invalid': 'Valor inválido.',
};

export type TranslationKey = keyof typeof ptBR;
export type Dictionary = Record<TranslationKey, string>;
