import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type { Order, OrderEditInput, OrderInput, OrderList, OrderStatus } from './order';

/** Order endpoints. Taking and cancelling orders is admin/waitress; the rest is any staff. */
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly api = inject(ApiClient);

  /** Active orders (open, ready, out for delivery) without `status`; otherwise the newest 100 in it. */
  list(status?: OrderStatus): Observable<OrderList> {
    return this.api.get<OrderList>('/orders', status ? { status } : undefined);
  }

  get(id: number): Observable<Order> {
    return this.api.get<Order>(`/orders/${id}`);
  }

  create(body: OrderInput): Observable<Order> {
    return this.api.post<Order>('/orders', body);
  }

  /** Editing a closed order reopens it. Fails with `order.cancelled` on a cancelled one. */
  update(id: number, body: OrderEditInput): Observable<Order> {
    return this.api.put<Order>(`/orders/${id}`, body);
  }

  /** Forward moves only; fails with `order.invalid_transition`. */
  setStatus(id: number, status: OrderStatus, note: string | null = null): Observable<Order> {
    return this.api.put<Order>(`/orders/${id}/status`, { status, note });
  }

  cancel(id: number, reason: string, note: string | null = null): Observable<Order> {
    return this.api.post<Order>(`/orders/${id}/cancel`, { reason, note });
  }

  reopen(id: number, note: string | null = null): Observable<Order> {
    return this.api.post<Order>(`/orders/${id}/reopen`, { note });
  }
}
