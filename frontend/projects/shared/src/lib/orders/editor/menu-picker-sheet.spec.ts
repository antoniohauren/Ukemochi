import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatActionListItemHarness } from '@angular/material/list/testing';
import type { Menu } from 'shared';
import { MenuPickerSheet } from './menu-picker-sheet';

const item = (id: number, name: string, variants: [number, string, boolean, number?][]) => ({
  id,
  category_id: 1,
  name,
  note: null,
  active: true,
  sort: 0,
  addons: [],
  variants: variants.map(([vid, vname, available, price = 1000]) => ({
    id: vid,
    item_id: id,
    name: vname,
    price_cents: price,
    available,
    sort: 0,
    print_name: null,
  })),
});

const MENU: Menu = {
  categories: [
    {
      id: 1,
      name: 'Uramaki',
      sort: 0,
      active: true,
      addons: [],
      items: [
        item(10, 'Philadelphia', [
          [100, 'Inteiro', true],
          [101, 'Meio', false],
        ]),
        item(11, 'Coca Zero', [[110, '', true]]),
        item(12, 'Hot roll', [
          [120, 'Inteiro', true, 3000],
          [121, 'Meio', true, 1600],
        ]),
      ],
    },
  ],
};

describe('MenuPickerSheet', () => {
  let dismiss: ReturnType<typeof vi.fn>;

  function setup() {
    localStorage.clear();
    dismiss = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_BOTTOM_SHEET_DATA, useValue: { menu: MENU } },
        { provide: MatBottomSheetRef, useValue: { dismiss } },
      ],
    });
    const fixture = TestBed.createComponent(MenuPickerSheet);
    return TestbedHarnessEnvironment.loader(fixture);
  }

  const tap = async (loader: ReturnType<typeof setup>, text: RegExp) =>
    (await loader.getHarness(MatActionListItemHarness.with({ text }))).click();

  it('picks category, item, then variant, and still offers unavailable variants', async () => {
    const loader = setup();
    await tap(loader, /Uramaki/);
    await tap(loader, /Philadelphia/);
    expect(
      await (await loader.getHarness(MatActionListItemHarness.with({ text: /Meio/ }))).getText(),
    ).toContain('Indisponível');
    await tap(loader, /Meio/);
    expect(dismiss).toHaveBeenCalledWith(101);
  });

  it('skips the variant step for an item with one variant', async () => {
    const loader = setup();
    await tap(loader, /Uramaki/);
    await tap(loader, /Coca Zero/);
    expect(dismiss).toHaveBeenCalledWith(110);
  });

  it('shows the item price only when all its variants cost the same', async () => {
    const loader = setup();
    await tap(loader, /Uramaki/);
    const text = async (name: RegExp) =>
      (await loader.getHarness(MatActionListItemHarness.with({ text: name }))).getText();
    expect(await text(/Philadelphia/)).toMatch(/10,00/);
    expect(await text(/Hot roll/)).not.toMatch(/R\$/);
  });
});
