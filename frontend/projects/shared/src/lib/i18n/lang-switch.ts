import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { type Lang, LANGS, LanguageService } from './language';
import type { TranslationKey } from './pt-br';
import { TPipe } from './t.pipe';

const LABELS: Record<Lang, TranslationKey> = { 'pt-BR': 'lang.pt-BR', en: 'lang.en' };

/** Picks the UI language; the choice is remembered on this device. */
@Component({
  selector: 'lib-lang-switch',
  imports: [MatButtonToggle, MatButtonToggleGroup, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group
      hideSingleSelectionIndicator
      [attr.aria-label]="'lang.label' | t"
      [value]="language.lang()"
      (change)="language.setLang($event.value)"
    >
      @for (lang of langs; track lang) {
        <mat-button-toggle [value]="lang">{{ labels[lang] | t }}</mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
})
export class LangSwitch {
  protected readonly language = inject(LanguageService);
  protected readonly langs = LANGS;
  protected readonly labels = LABELS;
}
