import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import type { ApiError } from '../api/api-client';
import { errorKey } from '../i18n/error-key';
import { LangSwitch } from '../i18n/lang-switch';
import type { TranslationKey } from '../i18n/pt-br';
import { TPipe } from '../i18n/t.pipe';
import { AuthService } from './auth';

/** Mirrors `LoginRequest` on the API; the API stays authoritative. */
export const PIN_PATTERN = /^\d{4}$/;

@Component({
  selector: 'lib-login-page',
  imports: [
    LangSwitch,
    MatButton,
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    pin: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PIN_PATTERN)],
    }),
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<TranslationKey | null>(null);
  protected readonly retryIn = this.auth.retryIn;

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.busy() || this.retryIn() > 0) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { name, pin } = this.form.getRawValue();
    try {
      await this.auth.login(name, pin);
      await this.router.navigateByUrl('/');
    } catch (e) {
      const error = e as ApiError;
      // throttled: the template shows the AuthService countdown instead
      if (error.code !== 'auth.throttled') {
        this.error.set(errorKey(error));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
