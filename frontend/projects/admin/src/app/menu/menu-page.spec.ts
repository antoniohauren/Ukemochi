import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
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
  const setItemActive = vi.fn();
  const deleteVariant = vi.fn(() => of(null));
  const reorderCategories = vi.fn(() => of(null));

  async function visit(url: string, menu: Menu = MENU) {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'menu', component: MenuPage }]),
        {
          provide: MenuApi,
          useValue: {
            menu: () => of(menu),
            setVariantAvailable,
            setItemActive,
            deleteVariant,
            reorderCategories,
          },
        },
      ],
    });
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);
    return {
      harness,
      loader,
      root: TestbedHarnessEnvironment.documentRootLoader(harness.fixture),
      el: harness.routeNativeElement as HTMLElement,
    };
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

  it('flips the active switch back when the API refuses', async () => {
    setItemActive.mockReturnValue(throwError(() => ({ code: 'forbidden', message: '' })));
    const { loader, harness } = await visit('/menu?category=1');
    const toggle = await loader.getHarness(MatSlideToggleHarness.with({ ancestor: '.items' }));
    await toggle.toggle();
    await harness.fixture.whenStable();
    expect(setItemActive).toHaveBeenCalledWith(10, false);
    expect(await toggle.isChecked()).toBe(true);
  });

  it('falls back a level when the URL points at nothing', async () => {
    const missingItem = await visit('/menu?category=1&item=99');
    expect(missingItem.el.querySelector('.panes')?.classList).toContain('depth-1');
    expect(missingItem.el.textContent).toContain('Escolha um item.');
    TestBed.resetTestingModule();
    const missingCategory = await visit('/menu?category=99');
    expect(missingCategory.el.querySelector('.panes')?.classList).toContain('depth-0');
    expect(missingCategory.el.textContent).toContain('Escolha uma categoria.');
  });

  it('moves a category with the arrow keys on its handle and keeps focus there', async () => {
    const drinks = { id: 2, name: 'Bebidas', sort: 1, active: true, addons: [], items: [] };
    const { el, harness } = await visit('/menu', { categories: [...MENU.categories, drinks] });
    const handle = el.querySelector<HTMLButtonElement>(
      '.categories .drag-handle[aria-label="Mover com as setas: Bebidas"]',
    );
    handle?.focus();
    handle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }));
    await harness.fixture.whenStable();
    expect(reorderCategories).toHaveBeenCalledWith({ ids: [2, 1] });
    expect(
      [...el.querySelectorAll('.categories [matListItemTitle]')].map((t) => t.textContent),
    ).toEqual(['Bebidas', 'Pastéis']);
    expect(document.activeElement).toBe(handle);
  });

  it('removes a variant only after confirming', async () => {
    const { loader, root } = await visit('/menu?category=1&item=10');
    const menu = await loader.getHarness(MatMenuHarness.with({ ancestor: '.detail .row' }));
    await menu.clickItem({ text: 'Remover variação' });
    expect(deleteVariant).not.toHaveBeenCalled();
    await (await root.getHarness(MatButtonHarness.with({ text: 'Remover' }))).click();
    await vi.waitFor(() => expect(deleteVariant).toHaveBeenCalledWith(100));
  });
});
