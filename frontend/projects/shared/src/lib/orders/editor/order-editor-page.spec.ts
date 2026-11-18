import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatButtonToggleHarness } from '@angular/material/button-toggle/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { CustomersApi } from '../../api/customers-api';
import { MenuApi } from '../../api/menu-api';
import { type Order } from '../../api/order';
import { OrdersApi } from '../../api/orders-api';
import { SettingsApi } from '../../api/settings-api';
import { OrderEditorPage } from './order-editor-page';
import { OrderEditorStore } from './order-editor-store';

const SAVED = {
  id: 12,
  type: 'pickup',
  customer_id: null,
  customer_name: 'Ana',
  address_text: null,
  delivery_fee_cents: 0,
  pay_on_delivery: false,
  pay_method: null,
  change_for_cents: null,
  note: null,
  lines: [],
} as unknown as Order;

const ANA = {
  id: 3,
  name: 'Ana Maria',
  phone: '11987654321',
  note: null,
  addresses: [
    { text: 'Rua A, 1', note: null },
    { text: 'Rua B, 2', note: null },
  ],
};

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
        { provide: CustomersApi, useValue: { list: () => of({ customers: [ANA] }) } },
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
    const phone = () => loader.getHarness(MatInputHarness.with({ selector: '[type="tel"]' }));
    const store = fixture.debugElement.injector.get(OrderEditorStore);
    return { fixture, loader, toggle, input, phone, store };
  }

  it('shows delivery fields only for delivery, with the settings fee', async () => {
    const { loader, toggle, input } = await setup(null);
    expect(await loader.getAllHarnesses(MatInputHarness)).toHaveLength(2); // name + note
    await (await toggle('Entrega')).check();
    expect(await (await input('delivery_fee')).getValue()).toMatch(/7,00/);
    expect(await (await input('address_text')).getValue()).toBe('');
    // Change for appears only with pay on delivery.
    expect(await loader.getAllHarnesses(MatInputHarness)).toHaveLength(5); // + phone
    await (await loader.getHarness(MatSlideToggleHarness)).check();
    expect(await loader.getAllHarnesses(MatInputHarness)).toHaveLength(6);
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

  it('fills a phone order from the customer found by phone', async () => {
    const { fixture, loader, toggle, input, phone } = await setup(null);
    await (await toggle('Entrega')).check();
    await (await phone()).setValue('(11) 98765-4321');
    await (await loader.getHarness(MatButtonHarness.with({ text: 'search' }))).click();
    await fixture.whenStable();
    expect(await (await input('customer_name')).getValue()).toBe('Ana Maria');
    expect(await (await input('address_text')).getValue()).toBe('Rua A, 1');
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Rua B, 2' }))).click();
    expect(await (await input('address_text')).getValue()).toBe('Rua B, 2');
    const form = (
      fixture.componentInstance as unknown as { form: { value: { customer_id: number } } }
    ).form;
    expect(form.value.customer_id).toBe(3);
  });

  it('gives a saved pickup order the settings fee when it becomes a delivery', async () => {
    const { toggle, input } = await setup('12');
    expect(await (await input('customer_name')).getValue()).toBe('Ana');
    await (await toggle('Entrega')).check();
    expect(await (await input('delivery_fee')).getValue()).toMatch(/7,00/);
  });
});
