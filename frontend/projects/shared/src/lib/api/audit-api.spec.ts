import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuditApi } from './audit-api';

describe('AuditApi', () => {
  it('sends only the filters that are set', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    TestBed.inject(AuditApi).page({ entity: 'order', entity_id: '', before: 90 }).subscribe();

    http.expectOne('/api/audit?entity=order&before=90').flush({ entries: [], next_before: null });
    http.verify();
  });
});
