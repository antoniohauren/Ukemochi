import type { ApiError } from '../api/api-client';
import { ptBR, type TranslationKey } from './pt-br';

/** Maps an API error code to its `error.<code>` key, or `error.unknown` when none exists. */
export function errorKey(error: Pick<ApiError, 'code'>): TranslationKey {
  const key = `error.${error.code}`;
  return key in ptBR ? (key as TranslationKey) : 'error.unknown';
}
