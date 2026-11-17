import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  type ApiError,
  errorKey,
  LanguageService,
  type Order,
  OrdersApi,
  type OrderStatus,
  OrdersStore,
  type TranslationKey,
} from 'shared';

/** The next forward move the board offers: ready, then out for delivery (delivery only), then closed. */
export type Move = Extract<OrderStatus, 'ready' | 'out_for_delivery' | 'closed'>;

export function nextStatus(o: Pick<Order, 'status' | 'type'>): Move | null {
  switch (o.status) {
    case 'open':
      return 'ready';
    case 'ready':
      return o.type === 'delivery' ? 'out_for_delivery' : 'closed';
    case 'out_for_delivery':
      return 'closed';
    default:
      return null;
  }
}

/** Status moves and the closed-orders list; active orders come live from OrdersStore. */
@Injectable()
export class OrderBoard {
  private readonly api = inject(OrdersApi);
  /** Refetched after a move, in case the live socket is down. */
  private readonly live = inject(OrdersStore, { optional: true });
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);

  readonly closed = signal<Order[] | null>(null);
  readonly closedError = signal<TranslationKey | null>(null);

  async loadClosed(): Promise<void> {
    try {
      this.closed.set((await firstValueFrom(this.api.list('closed'))).orders);
      this.closedError.set(null);
    } catch (e) {
      this.closedError.set(errorKey(e as ApiError));
    }
  }

  /** Failures show as a snackbar. */
  async advance(o: Order): Promise<void> {
    const to = nextStatus(o);
    if (to === null) {
      return;
    }
    try {
      await firstValueFrom(this.api.setStatus(o.id, to));
      this.live?.load();
    } catch (e) {
      this.snackBar.open(this.language.t(errorKey(e as ApiError)), undefined, { duration: 4000 });
    }
  }

  async reopen(o: Order): Promise<void> {
    try {
      await firstValueFrom(this.api.reopen(o.id));
      this.closed.update((list) => list?.filter((c) => c.id !== o.id) ?? null);
    } catch (e) {
      this.snackBar.open(this.language.t(errorKey(e as ApiError)), undefined, { duration: 4000 });
    }
  }
}
