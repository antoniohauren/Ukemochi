import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  catchError,
  filter,
  firstValueFrom,
  map,
  merge,
  type Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import {
  type ApiError,
  errorKey,
  LanguageService,
  type Order,
  OrdersApi,
  RealtimeService,
  type TranslationKey,
} from 'shared';

type Loaded<T> = { ok: true; value: T } | { ok: false; error: TranslationKey };

/** Active orders, refetched on every `order.updated` and on reconnect. The newest request wins. */
@Injectable()
export class OrdersStore {
  private readonly api = inject(OrdersApi);
  private readonly reload = new Subject<void>();

  readonly orders = signal<Order[] | null>(null);
  readonly loadError = signal<TranslationKey | null>(null);

  constructor() {
    merge(this.reload, inject(RealtimeService).orderUpdates$)
      .pipe(
        switchMap(() => loaded(this.api.list().pipe(map((r) => r.orders)))),
        takeUntilDestroyed(),
      )
      .subscribe((r) => {
        if (r.ok) {
          this.orders.set(r.value);
        }
        this.loadError.set(r.ok ? null : r.error);
      });
  }

  load(): void {
    this.reload.next();
  }
}

/** One order, refetched when the API announces a change to it (or after a reconnect). */
@Injectable()
export class OrderStore {
  private readonly api = inject(OrdersApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  private readonly reload = new Subject<void>();
  private id = 0;

  readonly order = signal<Order | null>(null);
  readonly loadError = signal<TranslationKey | null>(null);

  constructor() {
    const changes = inject(RealtimeService).orderUpdates$.pipe(
      filter((e) => e === null || e.id === this.id),
    );
    merge(this.reload, changes)
      .pipe(
        switchMap(() => loaded(this.api.get(this.id))),
        takeUntilDestroyed(),
      )
      .subscribe((r) => {
        if (r.ok) {
          this.order.set(r.value);
        }
        this.loadError.set(r.ok ? null : r.error);
      });
  }

  open(id: number): void {
    this.id = id;
    this.reload.next();
  }

  /** Returns the error key on failure, so the caller can keep its dialog open. */
  async cancel(reason: string): Promise<TranslationKey | null> {
    try {
      this.order.set(await firstValueFrom(this.api.cancel(this.id, reason)));
    } catch (e) {
      return errorKey(e as ApiError);
    }
    this.snackBar.open(this.language.t('order.cancelled'), undefined, { duration: 3000 });
    return null;
  }
}

function loaded<T>(source: Observable<T>): Observable<Loaded<T>> {
  return source.pipe(
    map((value): Loaded<T> => ({ ok: true, value })),
    catchError((e: unknown) => of<Loaded<T>>({ ok: false, error: errorKey(e as ApiError) })),
  );
}
