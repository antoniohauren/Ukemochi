import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type { StockConfigInput, StockLevel } from './stock';

/** Stock levels. Any staff reads them; admin configures, buys and counts. Sales move stock on their own. */
@Injectable({ providedIn: 'root' })
export class StockApi {
  private readonly api = inject(ApiClient);

  /** Every variant in menu order. */
  levels(): Observable<StockLevel[]> {
    return this.api.get<{ stock: StockLevel[] }>('/stock').pipe(map((r) => r.stock));
  }

  configure(variantId: number, body: StockConfigInput): Observable<StockLevel> {
    return this.api.put<StockLevel>(`/stock/${variantId}`, body);
  }

  purchase(variantId: number, qty: number, note: string | null = null): Observable<StockLevel> {
    return this.api.post<StockLevel>(`/stock/${variantId}/purchases`, { qty, note });
  }

  /** Sets the expected quantity to `counted`. */
  adjust(variantId: number, counted: number, note: string | null = null): Observable<StockLevel> {
    return this.api.post<StockLevel>(`/stock/${variantId}/adjustments`, { qty: counted, note });
  }
}
