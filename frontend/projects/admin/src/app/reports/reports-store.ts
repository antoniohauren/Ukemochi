import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  type ApiError,
  type Backup,
  dayRange,
  errorKey,
  type Report,
  ReportsApi,
  type TranslationKey,
} from 'shared';

/** The report for a range of local days, and the backup list. */
@Injectable()
export class ReportsStore {
  private readonly api = inject(ReportsApi);

  readonly report = signal<Report | null>(null);
  readonly error = signal<TranslationKey | null>(null);
  readonly backups = signal<Backup[] | null>(null);
  readonly backupsError = signal<TranslationKey | null>(null);

  async load(fromDay: string, toDay: string): Promise<void> {
    const { from, to } = dayRange(fromDay, toDay);
    try {
      this.report.set(await firstValueFrom(this.api.period(from, to)));
      this.error.set(null);
    } catch (e) {
      this.error.set(errorKey(e as ApiError));
    }
  }

  async loadBackups(): Promise<void> {
    try {
      this.backups.set((await firstValueFrom(this.api.backups())).backups);
      this.backupsError.set(null);
    } catch (e) {
      this.backupsError.set(errorKey(e as ApiError));
    }
  }

  backupUrl(name: string): string {
    return this.api.backupUrl(name);
  }
}

/** Today as `YYYY-MM-DD` in local time (the value of `<input type="date">`). */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
