import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LangSwitch, TPipe } from 'shared';

@Component({
  selector: 'app-settings-page',
  imports: [LangSwitch, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="label">{{ 'lang.label' | t }}</h2>
    <lib-lang-switch />
  `,
  styles: `
    .label {
      margin: 0 0 16px;
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class SettingsPage {}
