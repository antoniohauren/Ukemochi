import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import {
  formatMoney,
  type Lang,
  LANGS,
  LangSwitch,
  ThemeSwitch,
  LanguageService,
  maxMoney,
  moneyValidator,
  type PaperWidth,
  parseMoney,
  TPipe,
  type TranslationKey,
} from 'shared';
import { SettingsStore } from './settings-store';

const PAPER_WIDTHS: readonly PaperWidth[] = [58, 80];

/** Restaurant settings (saved on the API) and this device's UI language. Rules mirror SettingsRequest. */
@Component({
  selector: 'app-settings-page',
  providers: [SettingsStore],
  imports: [
    LangSwitch,
    ThemeSwitch,
    MatButton,
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    MatOption,
    MatSelect,
    MatSlideToggle,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="label">{{ 'settings.restaurant' | t }}</h2>
    @if (store.settings()) {
      <form class="fields" [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field>
          <mat-label>{{ 'settings.restaurant_name' | t }}</mat-label>
          <input matInput formControlName="restaurant_name" maxlength="255" />
          <mat-error>{{ 'settings.restaurant_name.required' | t }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>{{ 'settings.language' | t }}</mat-label>
          <mat-select formControlName="language">
            @for (l of langs; track l) {
              <mat-option [value]="l">{{ langKey(l) | t }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>{{ 'settings.paper_width' | t }}</mat-label>
          <mat-select formControlName="paper_width">
            @for (w of widths; track w) {
              <mat-option [value]="w">{{ w }} {{ 'settings.paper_width.mm' | t }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-slide-toggle formControlName="delivery_fee_enabled">
          {{ 'settings.delivery_fee_enabled' | t }}
        </mat-slide-toggle>
        <mat-form-field>
          <mat-label>{{ 'settings.delivery_fee' | t }}</mat-label>
          <input matInput formControlName="delivery_fee" inputmode="decimal" autocomplete="off" />
          <mat-error>{{ 'menu.price.invalid' | t }}</mat-error>
        </mat-form-field>
        @if (error(); as key) {
          <p class="error" role="alert">{{ key | t }}</p>
        }
        <div class="main-action">
          <button matButton="filled" type="submit" [disabled]="busy()">
            {{ 'common.save' | t }}
          </button>
        </div>
      </form>
    } @else if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
      <button matButton="tonal" type="button" (click)="store.load()">
        {{ 'common.retry' | t }}
      </button>
    }

    <h2 class="label">{{ 'settings.device' | t }}</h2>
    <p class="muted">{{ 'lang.label' | t }}</p>
    <lib-lang-switch />
    <p class="muted theme">{{ 'theme.label' | t }}</p>
    <lib-theme-switch />
  `,
  styles: `
    .label {
      margin: 0 0 16px;
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .label:not(:first-child) {
      margin-top: 32px;
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 480px;
    }
    .muted {
      margin: 0 0 8px;
      color: var(--mat-sys-on-surface-variant);
    }
    .theme {
      margin-top: 16px;
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }
    .main-action {
      padding: 8px 0;
    }
    @media (max-width: 599.98px) {
      .main-action button {
        width: 100%;
      }
    }
  `,
})
export class SettingsPage {
  protected readonly store = inject(SettingsStore);
  private readonly lang = inject(LanguageService).lang;
  protected readonly langs = LANGS;
  protected readonly widths = PAPER_WIDTHS;

  protected readonly form = new FormGroup({
    restaurant_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)],
    }),
    language: new FormControl<Lang>('pt-BR', { nonNullable: true }),
    paper_width: new FormControl<PaperWidth>(80, { nonNullable: true }),
    delivery_fee_enabled: new FormControl(false, { nonNullable: true }),
    delivery_fee: new FormControl('', {
      nonNullable: true,
      // SettingsRequest: delivery_fee_cents max:100000000
      validators: [moneyValidator, maxMoney(100_000_000)],
    }),
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<TranslationKey | null>(null);

  constructor() {
    // Fill the form whenever the API answers (load or save).
    effect(() => {
      const s = this.store.settings();
      if (s) {
        const { delivery_fee_cents, ...rest } = s;
        this.form.setValue({
          ...rest,
          delivery_fee: formatMoney(delivery_fee_cents, untracked(this.lang)),
        });
      }
    });
    void this.store.load();
  }

  protected langKey(lang: Lang): TranslationKey {
    return `lang.${lang}`;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { delivery_fee, restaurant_name, ...rest } = this.form.getRawValue();
    this.error.set(
      await this.store.save({
        ...rest,
        restaurant_name: restaurant_name.trim(),
        delivery_fee_cents: parseMoney(delivery_fee) ?? 0,
      }),
    );
    this.busy.set(false);
  }
}
