import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, firstValueFrom, map, of, Subject, switchMap } from 'rxjs';
import {
  type Allocation,
  type ApiError,
  errorKey,
  type OrderPayments,
  type PaymentInput,
  PaymentsApi,
  type SplitInput,
  type SplitResult,
  type TranslationKey,
} from 'shared';

/** How this payer's amount is found: typed in, an equal share, or the units of each line they had. */
export type PayMode = 'amount' | 'equal' | 'items';

export interface Suggestion {
  amount_cents: number;
  allocations: Allocation[];
}

export type PayResult =
  | { ok: true; change_cents: number | null; settled: boolean }
  | { ok: false; error: TranslationKey };

/**
 * Pay screen state: the order with its payments, and the split preview for the next payer.
 * The API computes every share; this only keeps what the waitress picked.
 */
@Injectable()
export class PayStore {
  private readonly api = inject(PaymentsApi);
  private readonly previews = new Subject<SplitInput | null>();
  private id = 0;

  readonly data = signal<OrderPayments | null>(null);
  readonly loadError = signal<TranslationKey | null>(null);
  readonly mode = signal<PayMode>('amount');
  /** Payers left for an equal split. */
  readonly n = signal(2);
  /** Units this payer takes per line id; missing = none. */
  readonly picks = signal<Record<number, number>>({});
  readonly preview = signal<SplitResult | null>(null);
  readonly previewError = signal<TranslationKey | null>(null);
  readonly saving = signal(false);

  readonly balance = computed(() => this.data()?.order.balance_cents ?? 0);

  /** What this payer should pay, or null while the preview is pending or nothing is picked. */
  readonly suggestion = computed<Suggestion | null>(() => {
    if (this.mode() === 'amount') {
      return { amount_cents: Math.max(0, this.balance()), allocations: [] };
    }
    const share = this.preview()?.shares[0];
    return share ? { amount_cents: share.amount_cents, allocations: share.allocations } : null;
  });

  constructor() {
    this.previews
      .pipe(
        switchMap((body) =>
          body === null
            ? of({ ok: true as const, value: null })
            : this.api.split(this.id, body).pipe(
                map((value) => ({ ok: true as const, value })),
                catchError((e: unknown) =>
                  of({ ok: false as const, error: errorKey(e as ApiError) }),
                ),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((r) => {
        this.preview.set(r.ok ? r.value : null);
        this.previewError.set(r.ok ? null : r.error);
      });
  }

  async open(id: number): Promise<void> {
    this.id = id;
    try {
      this.data.set(await firstValueFrom(this.api.forOrder(id)));
      this.loadError.set(null);
      this.refreshPreview();
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  setMode(mode: PayMode): void {
    this.mode.set(mode);
    this.refreshPreview();
  }

  setN(n: number): void {
    this.n.set(Math.min(50, Math.max(1, n)));
    this.refreshPreview();
  }

  /** Sets the units this payer takes of a line, from 0 to the line quantity. */
  setPick(lineId: number, qty: number): void {
    const max = this.data()?.order.lines.find((l) => l.id === lineId)?.qty ?? 0;
    const units = Math.min(max, Math.max(0, qty));
    this.picks.update((p) => {
      const rest = Object.fromEntries(Object.entries(p).filter(([id]) => Number(id) !== lineId));
      return units === 0 ? rest : { ...rest, [lineId]: units };
    });
    this.refreshPreview();
  }

  /** Records the payment; an equal split then has one payer less, picks start over. */
  async pay(body: PaymentInput): Promise<PayResult> {
    this.saving.set(true);
    try {
      const result = await firstValueFrom(this.api.pay(this.id, body));
      this.data.set(result);
      if (this.mode() === 'equal' && this.n() > 1) {
        this.n.update((n) => n - 1);
      }
      this.picks.set({});
      this.refreshPreview();
      const payment = result.payments[result.payments.length - 1];
      return {
        ok: true,
        change_cents: payment?.change_cents ?? null,
        settled: result.order.balance_cents <= 0,
      };
    } catch (e) {
      return { ok: false, error: errorKey(e as ApiError) };
    } finally {
      this.saving.set(false);
    }
  }

  /** Voids a payment; returns the error key on failure. */
  async void(paymentId: number): Promise<TranslationKey | null> {
    try {
      this.data.set(await firstValueFrom(this.api.void(paymentId)));
      this.refreshPreview();
      return null;
    } catch (e) {
      return errorKey(e as ApiError);
    }
  }

  private refreshPreview(): void {
    this.previews.next(this.splitBody());
  }

  private splitBody(): SplitInput | null {
    switch (this.mode()) {
      case 'amount':
        return null;
      case 'equal':
        return { mode: 'equal', n: this.n() };
      case 'items': {
        const picks = Object.entries(this.picks()).map(([line, qty]) => ({
          line_id: Number(line),
          qty: String(qty),
        }));
        return picks.length ? { mode: 'units', payers: [{ picks }] } : null;
      }
    }
  }
}
