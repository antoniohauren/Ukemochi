import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import type { DraftLine } from 'shared';
import { LineSheet, type LineSheetData } from './line-sheet';

const LINE: DraftLine = {
  id: null,
  variant_id: 100,
  category_name: 'Uramaki',
  item_name: 'Philadelphia',
  variant_name: 'Inteiro',
  print_name: null,
  unit_price_cents: 3200,
  qty: 1,
  note: null,
  addons: [],
};
const OPTIONS = [
  { addon_id: 30, name: 'Cream cheese', price_cents: 300 },
  { addon_id: 20, name: 'Gergelim', price_cents: 100 },
];

describe('LineSheet', () => {
  let dismiss: ReturnType<typeof vi.fn>;

  async function setup(data: Partial<LineSheetData> = {}) {
    localStorage.clear();
    dismiss = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MAT_BOTTOM_SHEET_DATA,
          useValue: { line: LINE, options: OPTIONS, removable: false, ...data },
        },
        { provide: MatBottomSheetRef, useValue: { dismiss } },
      ],
    });
    const fixture = TestBed.createComponent(LineSheet);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const [qty, note] = await loader.getAllHarnesses(MatInputHarness);
    return { fixture, loader, qty, note };
  }

  it('returns the line with qty, picked add-ons and trimmed note', async () => {
    const { loader, qty, note } = await setup();
    await (await loader.getHarness(MatButtonHarness.with({ text: 'add' }))).click();
    expect(await qty.getValue()).toBe('2');
    await (await loader.getHarness(MatCheckboxHarness.with({ label: /Gergelim/ }))).check();
    await note.setValue(' sem cebola ');
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Adicionar' }))).click();
    expect(dismiss).toHaveBeenCalledWith({
      ...LINE,
      qty: 2,
      note: 'sem cebola',
      addons: [OPTIONS[1]],
    });
  });

  it.each(['0', '1000', '1.5', ''])('refuses qty %j', async (value) => {
    const { loader, qty } = await setup();
    await qty.setValue(value);
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Adicionar' }))).click();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('keeps the selected add-ons of a saved line and can remove it', async () => {
    const { loader } = await setup({ line: { ...LINE, addons: [OPTIONS[0]] }, removable: true });
    const box = await loader.getHarness(MatCheckboxHarness.with({ label: /Cream cheese/ }));
    expect(await box.isChecked()).toBe(true);
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Remover' }))).click();
    expect(dismiss).toHaveBeenCalledWith('remove');
  });
});
