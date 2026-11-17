import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type { CashMovementInput, Shift } from './cash';

/** Cash shifts. Any staff reads the open one; admin/waitress open, move cash and close; admin lists past ones. */
@Injectable({ providedIn: 'root' })
export class CashApi {
  private readonly api = inject(ApiClient);

  /** Null while no shift is open. */
  current(): Observable<Shift | null> {
    return this.api.get<{ shift: Shift | null }>('/shifts/current').pipe(map((r) => r.shift));
  }

  /** Newest first. */
  recent(): Observable<Shift[]> {
    return this.api.get<{ shifts: Shift[] }>('/shifts').pipe(map((r) => r.shifts));
  }

  get(id: number): Observable<Shift> {
    return this.api.get<Shift>(`/shifts/${id}`);
  }

  /** Fails with `cash.shift_already_open`. */
  open(openingFloatCents: number, note: string | null = null): Observable<Shift> {
    return this.api.post<Shift>('/shifts', { opening_float_cents: openingFloatCents, note });
  }

  /** Fails with `cash.no_open_shift`. */
  addMovement(body: CashMovementInput): Observable<Shift> {
    return this.api.post<Shift>('/shifts/current/movements', body);
  }

  close(countedCents: number, note: string | null = null): Observable<Shift> {
    return this.api.post<Shift>('/shifts/current/close', { counted_cents: countedCents, note });
  }
}
