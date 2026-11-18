import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type { Customer, CustomerInput, CustomerList } from './customer';
import type { OrderList } from './order';

/** Customer endpoints, front of house (admin, waitress). */
@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private readonly api = inject(ApiClient);

  /** By name or phone digits; all when `q` is empty. */
  list(q = ''): Observable<CustomerList> {
    return this.api.get<CustomerList>('/customers', q ? { q } : undefined);
  }

  get(id: number): Observable<Customer> {
    return this.api.get<Customer>(`/customers/${id}`);
  }

  /** Newest first. */
  orders(id: number): Observable<OrderList> {
    return this.api.get<OrderList>(`/customers/${id}/orders`);
  }

  /** Fails with `customer.phone_taken` when another customer has the phone. */
  create(body: CustomerInput): Observable<Customer> {
    return this.api.post<Customer>('/customers', body);
  }

  update(id: number, body: CustomerInput): Observable<Customer> {
    return this.api.put<Customer>(`/customers/${id}`, body);
  }
}
