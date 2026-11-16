import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { MenuApi } from './menu-api';

describe('MenuApi', () => {
  let menu: MenuApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    menu = TestBed.inject(MenuApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the menu tree', async () => {
    const result = firstValueFrom(menu.menu());
    http.expectOne({ method: 'GET', url: '/api/menu' }).flush({ categories: [] });
    expect(await result).toEqual({ categories: [] });
  });

  it('toggles availability with an audit note', () => {
    menu.setVariantAvailable(5, false, 'acabou').subscribe();
    const req = http.expectOne({ method: 'PUT', url: '/api/variants/5/available' });
    expect(req.request.body).toEqual({ available: false, note: 'acabou' });
    req.flush({});
  });

  it('sends the new order of categories and of the variants of an item', () => {
    menu.reorderCategories({ ids: [2, 1] }).subscribe();
    expect(http.expectOne({ method: 'PUT', url: '/api/categories/order' }).request.body).toEqual({
      ids: [2, 1],
    });
    menu.reorderVariants(10, { ids: [101, 100] }).subscribe();
    const req = http.expectOne({ method: 'PUT', url: '/api/items/10/variants/order' });
    expect(req.request.body).toEqual({ ids: [101, 100] });
  });

  it('sends the delete note as a query param', () => {
    menu.deleteVariant(5, 'saiu').subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/variants/5?note=saiu' }).flush(null);
    menu.deleteVariant(6).subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/variants/6' }).flush(null);
  });
});
