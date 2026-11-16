import type { DraftLine, Order } from 'shared';
import { feeCents, orderBody, orderForm, orderFormValue } from './order-form';

const LINE: DraftLine = {
  id: 9,
  variant_id: 100,
  item_name: 'Philadelphia',
  variant_name: 'Inteiro',
  unit_price_cents: 3200,
  qty: 2,
  note: null,
  addons: [{ addon_id: 30, name: 'Cream cheese', price_cents: 300 }],
};

describe('order form', () => {
  it('needs a customer name on every type', () => {
    const form = orderForm();
    expect(form.valid).toBe(false);
    form.controls.customer_name.setValue('   ');
    expect(form.valid).toBe(false);
    form.controls.customer_name.setValue('Ana');
    expect(form.valid).toBe(true);
    form.controls.customer_name.setValue('x'.repeat(256));
    expect(form.valid).toBe(false);
  });

  it('needs an address and a valid fee only for delivery', () => {
    const form = orderForm();
    form.patchValue({ customer_name: 'Ana', delivery_fee: 'abc' });
    expect(form.valid).toBe(true);

    form.controls.type.setValue('delivery');
    expect(form.controls.address_text.hasError('required')).toBe(true);
    expect(form.controls.delivery_fee.hasError('money')).toBe(true);

    form.patchValue({ address_text: 'Rua A, 10', delivery_fee: '7,00' });
    expect(form.valid).toBe(true);
    form.controls.change_for.setValue('100');
    expect(form.valid).toBe(true);
    form.controls.change_for.setValue('-1');
    expect(form.valid).toBe(false);

    form.controls.type.setValue('pickup');
    expect(form.valid).toBe(true);
  });

  it('builds a delivery body with fee, pay on delivery and change', () => {
    const form = orderForm();
    form.setValue({
      type: 'delivery',
      customer_name: ' Ana ',
      address_text: ' Rua A, 10 ',
      delivery_fee: '7,00',
      pay_on_delivery: true,
      change_for: '100',
      note: '',
    });
    expect(orderBody(form.getRawValue(), [LINE])).toEqual({
      type: 'delivery',
      customer_name: 'Ana',
      address_text: 'Rua A, 10',
      delivery_fee_cents: 700,
      pay_on_delivery: true,
      change_for_cents: 10000,
      note: null,
      lines: [{ id: 9, variant_id: 100, qty: 2, note: null, addon_ids: [30] }],
    });
  });

  it('clears delivery fields on other types', () => {
    const form = orderForm();
    form.setValue({
      type: 'dine_in',
      customer_name: 'Ana',
      address_text: 'Rua A',
      delivery_fee: '7,00',
      pay_on_delivery: true,
      change_for: '100',
      note: ' mesa da janela ',
    });
    const v = form.getRawValue();
    expect(feeCents(v)).toBe(0);
    expect(orderBody(v, [])).toMatchObject({
      address_text: null,
      delivery_fee_cents: 0,
      pay_on_delivery: false,
      change_for_cents: null,
      note: 'mesa da janela',
    });
  });

  it('fills the form from a saved order', () => {
    const order = {
      type: 'delivery',
      customer_name: 'Ana',
      address_text: 'Rua A',
      delivery_fee_cents: 700,
      pay_on_delivery: false,
      change_for_cents: null,
      note: null,
    } as Order;
    const v = orderFormValue(order, 'pt-BR');
    expect(v).toMatchObject({ address_text: 'Rua A', change_for: '', note: '' });
    expect(feeCents(v)).toBe(700);
  });
});
