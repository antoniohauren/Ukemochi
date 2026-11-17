import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom, type Observable } from 'rxjs';
import {
  type ApiError,
  CashApi,
  type CashMovementInput,
  errorKey,
  LanguageService,
  type Shift,
  StaffApi,
  type TranslationKey,
} from 'shared';

/** Caixa: the open shift, recent shifts and staff names for "opened by". */
@Injectable()
export class CashStore {
  private readonly api = inject(CashApi);
  private readonly staff = inject(StaffApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);

  /** undefined while loading; null when no shift is open. */
  readonly current = signal<Shift | null | undefined>(undefined);
  readonly recent = signal<Shift[]>([]);
  readonly names = signal<Record<number, string>>({});
  readonly loadError = signal<TranslationKey | null>(null);

  async load(): Promise<void> {
    try {
      const [current, recent, staff] = await Promise.all([
        firstValueFrom(this.api.current()),
        firstValueFrom(this.api.recent()),
        firstValueFrom(this.staff.list()),
      ]);
      this.current.set(current);
      this.recent.set(recent);
      this.names.set(Object.fromEntries(staff.users.map((u) => [u.id, u.name])));
      this.loadError.set(null);
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  open(floatCents: number, note: string | null): Promise<TranslationKey | null> {
    return this.write(this.api.open(floatCents, note), 'cash.opened');
  }

  addMovement(body: CashMovementInput): Promise<TranslationKey | null> {
    return this.write(this.api.addMovement(body), 'cash.movement_saved');
  }

  close(countedCents: number, note: string | null): Promise<TranslationKey | null> {
    return this.write(this.api.close(countedCents, note), 'cash.closed');
  }

  /** Returns the error key on failure, so the dialog stays open; reloads the list after a change. */
  private async write(
    call: Observable<Shift>,
    done: TranslationKey,
  ): Promise<TranslationKey | null> {
    try {
      const shift = await firstValueFrom(call);
      this.current.set(shift.closed_at === null ? shift : null);
    } catch (e) {
      return errorKey(e as ApiError);
    }
    this.snackBar.open(this.language.t(done), undefined, { duration: 3000 });
    void firstValueFrom(this.api.recent()).then(
      (r) => this.recent.set(r),
      () => undefined,
    );
    return null;
  }
}
