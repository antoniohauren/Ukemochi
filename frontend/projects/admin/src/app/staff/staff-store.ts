import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom, type Observable } from 'rxjs';
import {
  type ApiError,
  AuthService,
  errorKey,
  LanguageService,
  StaffApi,
  type StaffUser,
  type TranslationKey,
} from 'shared';
import type { StaffForm } from './staff-form-dialog';

/** Staff list and every staff write. Saves reload the list from the API. */
@Injectable()
export class StaffStore {
  private readonly api = inject(StaffApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly users = signal<StaffUser[] | null>(null);
  readonly loadError = signal<TranslationKey | null>(null);

  async load(): Promise<void> {
    try {
      this.users.set((await firstValueFrom(this.api.list())).users);
      this.loadError.set(null);
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  /** A new user gets the typed PIN; an existing one keeps theirs (see resetPin). */
  async save(id: number | null, v: StaffForm): Promise<TranslationKey | null> {
    const body = { name: v.name, role: v.role, active: v.active };
    const error = await this.write(
      id === null ? this.api.create({ ...body, pin: v.pin }) : this.api.update(id, body),
      'staff.saved',
    );
    if (error !== null) {
      return error;
    }
    if (id !== null && id === this.auth.user()?.id) {
      // Editing yourself: a demoted or deactivated admin must leave the admin screens.
      await this.auth.restore();
      if (this.auth.user()?.role !== 'admin') {
        await this.router.navigateByUrl('/');
        return null;
      }
    }
    await this.load();
    return null;
  }

  resetPin(id: number, v: StaffForm): Promise<TranslationKey | null> {
    return this.write(this.api.resetPin(id, v.pin), 'staff.pin_reset');
  }

  /** Returns the error key on failure, so the dialog can show it and stay open. */
  private async write(
    call: Observable<unknown>,
    done: TranslationKey,
  ): Promise<TranslationKey | null> {
    try {
      await firstValueFrom(call);
    } catch (e) {
      return errorKey(e as ApiError);
    }
    this.snackBar.open(this.language.t(done), undefined, { duration: 3000 });
    return null;
  }
}
