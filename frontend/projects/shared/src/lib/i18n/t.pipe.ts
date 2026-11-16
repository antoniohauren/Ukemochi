import { inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from './language';
import type { TranslationKey } from './pt-br';

/** Impure so it re-evaluates after a language switch. */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(key: TranslationKey): string {
    return this.language.t(key);
  }
}
