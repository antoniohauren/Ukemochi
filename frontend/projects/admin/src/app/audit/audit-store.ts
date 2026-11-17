import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  type ApiError,
  type AuditEntry,
  AuditApi,
  type AuditQuery,
  errorKey,
  type TranslationKey,
} from 'shared';

/** Change log pages, newest first; `more()` appends the next older page. */
@Injectable()
export class AuditStore {
  private readonly api = inject(AuditApi);
  private filter: AuditQuery = {};

  readonly entries = signal<AuditEntry[] | null>(null);
  readonly next = signal<number | null>(null);
  readonly error = signal<TranslationKey | null>(null);

  search(entity: string, entityId: string): Promise<void> {
    this.filter = { entity: entity.trim(), entity_id: entityId.trim() };
    this.entries.set(null);
    return this.fetch({});
  }

  more(): Promise<void> {
    const before = this.next();
    return before === null ? Promise.resolve() : this.fetch({ before });
  }

  private async fetch(page: AuditQuery): Promise<void> {
    try {
      const r = await firstValueFrom(this.api.page({ ...this.filter, ...page }));
      this.entries.update((e) => [...(page.before ? (e ?? []) : []), ...r.entries]);
      this.next.set(r.next_before);
      this.error.set(null);
    } catch (e) {
      this.error.set(errorKey(e as ApiError));
    }
  }
}
