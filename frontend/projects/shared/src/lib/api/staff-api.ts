import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type { NewStaffInput, StaffInput, StaffList, StaffUser } from './staff';

/** Staff endpoints, admin only. */
@Injectable({ providedIn: 'root' })
export class StaffApi {
  private readonly api = inject(ApiClient);

  list(): Observable<StaffList> {
    return this.api.get<StaffList>('/users');
  }

  create(body: NewStaffInput): Observable<StaffUser> {
    return this.api.post<StaffUser>('/users', body);
  }

  /** Fails with `user.last_admin` when it would leave no active admin. */
  update(id: number, body: StaffInput): Observable<StaffUser> {
    return this.api.put<StaffUser>(`/users/${id}`, body);
  }

  resetPin(id: number, pin: string): Observable<void> {
    return this.api.put<void>(`/users/${id}/pin`, { pin });
  }
}
