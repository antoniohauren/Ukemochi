import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type { BackupList, Report } from './report';

/** Sales reports and database backups; admin only. */
@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly api = inject(ApiClient);

  /** `from`/`to`: ISO 8601 instants; `to` is exclusive, at most 366 days after `from`. */
  period(from: string, to: string): Observable<Report> {
    return this.api.get<Report>('/reports', { from, to });
  }

  backups(): Observable<BackupList> {
    return this.api.get<BackupList>('/backups');
  }

  /** Plain link target: the browser downloads it with the session cookie. */
  backupUrl(name: string): string {
    return `/api/backups/${encodeURIComponent(name)}`;
  }
}

/** Local calendar days `YYYY-MM-DD` (inclusive) as the instants the API wants: local midnight to the next day's. */
export function dayRange(fromDay: string, toDay: string): { from: string; to: string } {
  const at = (day: string, plus: number) => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d + plus).toISOString();
  };
  return { from: at(fromDay, 0), to: at(toDay, 1) };
}
