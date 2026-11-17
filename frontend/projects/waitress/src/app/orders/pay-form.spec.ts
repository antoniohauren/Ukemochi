import { payForm, paymentInput } from './pay-form';

describe('payForm', () => {
  it('needs a positive amount', () => {
    const form = payForm();
    expect(form.valid).toBe(false);
    form.controls.amount.setValue('0,00');
    expect(form.controls.amount.hasError('positive')).toBe(true);
    form.controls.amount.setValue('32,00');
    expect(form.valid).toBe(true);
  });

  it('wants tendered cash to cover the amount, only for cash', () => {
    const form = payForm();
    form.setValue({ method: 'cash', amount: '32,00', tendered: '20,00', payer_label: '' });
    expect(form.hasError('tendered')).toBe(true);
    form.controls.tendered.setValue('50');
    expect(form.valid).toBe(true);
    form.setValue({ method: 'pix', amount: '32,00', tendered: '1', payer_label: '' });
    expect(form.valid).toBe(true);
  });

  it('builds the body, tendered for cash only, allocations when split by items', () => {
    const form = payForm();
    form.setValue({ method: 'cash', amount: '32,00', tendered: '50,00', payer_label: ' Ana ' });
    expect(paymentInput(form, [])).toEqual({
      method: 'cash',
      amount_cents: 3200,
      tendered_cents: 5000,
      payer_label: 'Ana',
    });

    form.setValue({ method: 'debit', amount: '16', tendered: '50,00', payer_label: '' });
    expect(paymentInput(form, [{ line_id: 5, qty: '1/2' }])).toEqual({
      method: 'debit',
      amount_cents: 1600,
      tendered_cents: null,
      payer_label: null,
      allocations: [{ line_id: 5, qty: '1/2' }],
    });
  });
});
