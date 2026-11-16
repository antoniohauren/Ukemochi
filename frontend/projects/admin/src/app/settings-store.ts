import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  type ApiError,
  errorKey,
  LanguageService,
  type Settings,
  SettingsApi,
  type TranslationKey,
} from 'shared';

/** Restaurant settings as the API stores them. */
@Injectable()
export class SettingsStore {
  private readonly api = inject(SettingsApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);

  readonly settings = signal<Settings | null>(null);
  readonly loadError = signal<TranslationKey | null>(null);

  async load(): Promise<void> {
    try {
      this.settings.set(await firstValueFrom(this.api.get()));
      this.loadError.set(null);
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  /** Returns the error key on failure, so the form can show it. */
  async save(body: Settings): Promise<TranslationKey | null> {
    try {
      this.settings.set(await firstValueFrom(this.api.update(body)));
    } catch (e) {
      return errorKey(e as ApiError);
    }
    this.snackBar.open(this.language.t('settings.saved'), undefined, { duration: 3000 });
    return null;
  }
}
