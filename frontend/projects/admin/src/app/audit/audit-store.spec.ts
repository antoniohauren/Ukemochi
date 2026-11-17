import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { type AuditEntry, AuditApi } from 'shared';
import { AuditStore } from './audit-store';

const entry = (id: number) => ({ id }) as AuditEntry;

describe('AuditStore', () => {
  it('searches, then appends older pages with the filter kept', async () => {
    const page = vi
      .fn()
      .mockReturnValueOnce(of({ entries: [entry(9), entry(8)], next_before: 8 }))
      .mockReturnValueOnce(of({ entries: [entry(7)], next_before: null }));
    TestBed.configureTestingModule({
      providers: [AuditStore, { provide: AuditApi, useValue: { page } }],
    });
    const store = TestBed.inject(AuditStore);

    await store.search(' order ', '42');
    await store.more();
    await store.more();

    expect(page).toHaveBeenNthCalledWith(1, { entity: 'order', entity_id: '42' });
    expect(page).toHaveBeenNthCalledWith(2, { entity: 'order', entity_id: '42', before: 8 });
    expect(page).toHaveBeenCalledTimes(2);
    expect(store.entries()?.map((e) => e.id)).toEqual([9, 8, 7]);
    expect(store.next()).toBeNull();
  });
});
