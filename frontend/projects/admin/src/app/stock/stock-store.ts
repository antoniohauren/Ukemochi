import { computed, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom, type Observable } from 'rxjs';
import {
  type ApiError,
  errorKey,
  LanguageService,
  StockApi,
  type StockLevel,
  type TranslationKey,
} from 'shared';
import type { StockForm, StockFormMode } from './stock-form-dialog';

/** Stock levels and every stock write. Saves reload the list from the API. */
@Injectable()
export class StockStore {
  private readonly api = inject(StockApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);

  readonly levels = signal<StockLevel[] | null>(null);
  readonly loadError = signal<TranslationKey | null>(null);
  /** Tracked variants at or below their minimum, or out. */
  readonly alerts = computed(() =>
    (this.levels() ?? []).filter((l) => l.track_stock && l.status !== 'ok'),
  );

  async load(): Promise<void> {
    try {
      this.levels.set(await firstValueFrom(this.api.levels()));
      this.loadError.set(null);
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  /** Returns the error key on failure, so the dialog can show it and stay open. */
  async save(mode: StockFormMode, variantId: number, v: StockForm): Promise<TranslationKey | null> {
    const note = v.note.trim() || null;
    const calls: Record<StockFormMode, () => Observable<StockLevel>> = {
      settings: () =>
        this.api.configure(variantId, { track_stock: v.track, stock_min: v.min, note }),
      purchase: () => this.api.purchase(variantId, v.qty ?? 0, note),
      count: () => this.api.adjust(variantId, v.qty ?? 0, note),
    };
    try {
      await firstValueFrom(calls[mode]());
    } catch (e) {
      return errorKey(e as ApiError);
    }
    this.snackBar.open(this.language.t('stock.saved'), undefined, { duration: 3000 });
    await this.load();
    return null;
  }
}
