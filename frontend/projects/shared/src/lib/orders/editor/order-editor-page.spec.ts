import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonToggleHarness } from '@angular/material/button-toggle/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { MenuApi } from '../../api/menu-api';
import { type Order } from '../../api/order';
import { OrdersApi } from '../../api/orders-api';
import { SettingsApi } from '../../api/settings-api';
import { OrderEditorPage } from './order-editor-page';
import { OrderEditorStore } from './order-editor-store';

const SAVED = {
  id: 12,
  type: 'pickup',
  customer_name: 'Ana',
  address_text: null,
  delivery_fee_cents: 0,
  pay_on_delivery: false,
  pay_method: null,
  change_for_cents: null,
  note: null,
  lines: [],
} as unknown as Order;

describe('OrderEditorPage', () => {
  async function setup(id: string | null) {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: MenuApi, useValue: { menu: () => of({ categories: [] }) } },
        {
          provide: SettingsApi,
          useValue: { get: () => of({ delivery_fee_enabled: true, delivery_fee_cents: 700 }) },
        },
        { provide: OrdersApi, useValue: { get: () => of(SAVED) } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id === null ? {} : { id }) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(OrderEditorPage);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const toggle = (text: string) => loader.getHarness(MatButtonToggleHarness.with({ text }));
    const input = (label: string) =>
      loader.getHarness(MatInputHarness.with({ selector: `[formControlName="${label}"]` }));
    const store = fixture.debugElement.injector.get(OrderEditorStore);
    return { fixture, loader, toggle, input, store };
  }

  it('shows delivery fields only for delivery, with the settings fee', async () => {
    const { loader, toggle, input } = await setup(null);
    expect(await loader.getAllHarnesses(MatInputHarness)).toHaveLength(2); // name + note
    await (await toggle('Entrega')).check();
    expect(await (await input('delivery_fee')).getValue()).toMatch(/7,00/);
    expect(await (await input('address_text')).getValue()).toBe('');
    // Change for appears only with pay on delivery.
    expect(await loader.getAllHarnesses(MatInputHarness)).toHaveLength(4);
    await (await loader.getHarness(MatSlideToggleHarness)).check();
    expect(await loader.getAllHarnesses(MatInputHarness)).toHaveLength(5);
  });

  it('does not block the other types on hidden delivery fields', async () => {
    const { fixture, toggle, input } = await setup(null);
    await (await input('customer_name')).setValue('Ana');
    await (await toggle('Entrega')).check();
    const form = (fixture.componentInstance as unknown as { form: { valid: boolean } }).form;
    expect(form.valid).toBe(false); // address missing
    await (await toggle('Retirada')).check();
    expect(form.valid).toBe(true);
  });

  it('gives a saved pickup order the settings fee when it becomes a delivery', async () => {
    const { toggle, input } = await setup('12');
    expect(await (await input('customer_name')).getValue()).toBe('Ana');
    await (await toggle('Entrega')).check();
    expect(await (await input('delivery_fee')).getValue()).toMatch(/7,00/);
  });
});
