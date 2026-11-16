import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatActionListItemHarness, MatListItemHarness } from '@angular/material/list/testing';
import type { LineView } from './order-draft';
import { OrderLines } from './order-lines';

const LINES: LineView[] = [
  {
    item_name: 'Philadelphia',
    variant_name: 'Inteiro',
    qty: 2,
    note: 'sem cebola',
    addons: [{ addon_id: 30, name: 'Cream cheese', price_cents: 300 }],
    total_cents: 7000,
  },
  { item_name: 'Coca Zero', variant_name: '', qty: 1, note: null, addons: [], total_cents: 600 },
];

describe('OrderLines', () => {
  function setup(selectable: boolean) {
    localStorage.clear();
    const fixture = TestBed.createComponent(OrderLines);
    fixture.componentRef.setInput('lines', LINES);
    fixture.componentRef.setInput('selectable', selectable);
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('shows qty, names, add-ons, note and the line total', async () => {
    const { loader } = setup(false);
    const [first, second] = await loader.getAllHarnesses(MatListItemHarness);
    expect(await first.getTitle()).toBe('2× Philadelphia · Inteiro');
    const text = await first.getFullText();
    expect(text).toContain('+ Cream cheese');
    expect(text).toContain('sem cebola');
    expect(text).toMatch(/R\$\s70,00/);
    expect(await second.getTitle()).toBe('1× Coca Zero');
  });

  it('emits the index of a tapped line when selectable', async () => {
    const { fixture, loader } = setup(true);
    const picked: number[] = [];
    fixture.componentInstance.selectLine.subscribe((i) => picked.push(i));
    await (await loader.getAllHarnesses(MatActionListItemHarness))[1].click();
    expect(picked).toEqual([1]);
  });
});
