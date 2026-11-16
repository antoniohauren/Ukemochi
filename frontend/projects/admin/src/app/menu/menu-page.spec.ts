import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { type Menu, MenuApi } from 'shared';
import { MenuPage } from './menu-page';

const MENU: Menu = {
  categories: [
    {
      id: 1,
      name: 'Pastéis',
      sort: 0,
      active: true,
      addons: [],
      items: [
        {
          id: 10,
          category_id: 1,
          name: 'Carne',
          note: null,
          active: true,
          variants: [
            { id: 100, item_id: 10, name: '', price_cents: 1250, available: true, sort: 0 },
          ],
          addons: [],
        },
      ],
    },
  ],
};

describe('MenuPage', () => {
  const setVariantAvailable = vi.fn();

  async function visit(url: string) {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'menu', component: MenuPage }]),
        { provide: MenuApi, useValue: { menu: () => of(MENU), setVariantAvailable } },
      ],
    });
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);
    return { harness, loader, el: harness.routeNativeElement as HTMLElement };
  }

  it('shows the selected item with its default variant and price', async () => {
    const { el } = await visit('/menu?category=1&item=10');
    expect(el.querySelector('.detail')?.textContent).toContain('Padrão');
    expect(el.querySelector('.detail')?.textContent).toContain('12,50');
    expect(el.querySelector('.panes')?.classList).toContain('depth-2');
  });

  it('flips the availability switch back when the API refuses', async () => {
    setVariantAvailable.mockReturnValue(throwError(() => ({ code: 'forbidden', message: '' })));
    const { loader, harness } = await visit('/menu?category=1&item=10');
    const toggle = await loader.getHarness(MatSlideToggleHarness.with({ ancestor: '.detail' }));
    await toggle.toggle();
    await harness.fixture.whenStable();
    expect(setVariantAvailable).toHaveBeenCalledWith(100, false);
    expect(await toggle.isChecked()).toBe(true);
  });
});
