import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type { OrderPayments, PaymentInput, SplitInput, SplitResult } from './payment';

/** Payments: any staff reads; admin/waitress pay and void. Paying needs an open shift (`cash.no_open_shift`). */
@Injectable({ providedIn: 'root' })
export class PaymentsApi {
  private readonly api = inject(ApiClient);

  forOrder(orderId: number): Observable<OrderPayments> {
    return this.api.get<OrderPayments>(`/orders/${orderId}/payments`);
  }

  /** Paid in full closes the order (phone orders once ready / out for delivery). */
  pay(orderId: number, body: PaymentInput): Observable<OrderPayments> {
    return this.api.post<OrderPayments>(`/orders/${orderId}/payments`, body);
  }

  /** Preview only; fails with `split.invalid` (over-picked line, amounts above the balance). */
  split(orderId: number, body: SplitInput): Observable<SplitResult> {
    return this.api.post<SplitResult>(`/orders/${orderId}/split`, body);
  }

  /** Only while the payment's shift is open (`payment.shift_closed`). */
  void(paymentId: number, note: string | null = null): Observable<OrderPayments> {
    return this.api.post<OrderPayments>(`/payments/${paymentId}/void`, { note });
  }
}
