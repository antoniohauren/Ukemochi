import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type { AuditPage, AuditQuery } from './audit';

/** The change log; admin only. */
@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly api = inject(ApiClient);

  page(query: AuditQuery = {}): Observable<AuditPage> {
    const params: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params[key] = value as string | number;
      }
    }
    return this.api.get<AuditPage>('/audit', params);
  }
}
