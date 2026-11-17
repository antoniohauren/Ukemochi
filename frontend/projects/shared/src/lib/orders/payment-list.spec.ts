import { TestBed } from '@angular/core/testing';
import type { Payment } from '../api/payment';
import { PaymentList } from './payment-list';

const base = { order_id: 42, shift_id: 1, tendered_cents: null, change_cents: null } as const;
const PAYMENTS = [
  { ...base, id: 1, method: 'pix', amount_cents: 900, payer_label: 'Ana', voided: true },
  {
    ...base,
    id: 2,
    method: 'cash',
    amount_cents: 2000,
    change_cents: 3000,
    payer_label: null,
    voided: false,
  },
] as unknown as Payment[];

describe('PaymentList', () => {
  beforeEach(() => localStorage.clear());

  it('marks voided payments and offers void only on the others', () => {
    const fixture = TestBed.createComponent(PaymentList);
    fixture.componentRef.setInput('payments', PAYMENTS);
    fixture.componentRef.setInput('canVoid', true);
    const voided: Payment[] = [];
    fixture.componentInstance.voidPayment.subscribe((p) => voided.push(p));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const text = (el.textContent ?? '').replace(/\s+/g, ' ');

    expect(text).toContain('Pix · Ana');
    expect(text).toContain('Estornado');
    expect(text).toMatch(/Troco R\$\s?30,00/);
    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    buttons[0].click();
    expect(voided.map((p) => p.id)).toEqual([2]);
  });
});
