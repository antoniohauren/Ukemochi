import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type { Settings } from './settings';

/** Restaurant settings: any role reads, admin writes. */
@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly api = inject(ApiClient);

  get(): Observable<Settings> {
    return this.api.get<Settings>('/settings');
  }

  update(body: Settings): Observable<Settings> {
    return this.api.put<Settings>('/settings', body);
  }
}
