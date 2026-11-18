import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { TPipe } from '../i18n/t.pipe';
import { THEMES, ThemeService } from './theme';

/** Picks light or dark; the choice is remembered on this device. */
@Component({
  selector: 'lib-theme-switch',
  imports: [MatButtonToggle, MatButtonToggleGroup, MatIcon, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group
      hideSingleSelectionIndicator
      [attr.aria-label]="'theme.label' | t"
      [value]="themes.theme()"
      (change)="themes.setTheme($event.value)"
    >
      @for (theme of list; track theme) {
        <mat-button-toggle [value]="theme">
          <mat-icon aria-hidden="true">{{
            theme === 'light' ? 'light_mode' : 'dark_mode'
          }}</mat-icon>
          {{ (theme === 'light' ? 'theme.light' : 'theme.dark') | t }}
        </mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
})
export class ThemeSwitch {
  protected readonly themes = inject(ThemeService);
  protected readonly list = THEMES;
}
