import { TestBed } from '@angular/core/testing';
import type { Bill, KitchenTicket } from '../api/order';
import { TicketPrint } from './ticket-print';

const KITCHEN: KitchenTicket = {
  kind: 'kitchen',
  number: 42,
  type: 'dine_in',
  customer_name: 'Amanda',
  created_at: '2026-11-16T12:00:00+00:00',
  version: 2,
  updated_version: 2,
  cancelled: false,
  cancel_reason: null,
  note: 'mesa da janela',
  lines: [
    {
      qty: 2,
      category_name: 'Uramaki',
      item_name: 'Philadelphia',
      variant_name: 'Inteiro',
      print_name: null,
      addons: ['Cream cheese'],
      note: 'sem cebolinha',
    },
  ],
};

const BILL: Bill = {
  kind: 'bill',
  number: 43,
  type: 'delivery',
  customer_name: 'Ana',
  address_text: 'Rua A, 1',
  created_at: '2026-11-16T12:00:00+00:00',
  version: 1,
  cancelled: false,
  note: null,
  lines: [
    {
      id: 1,
      variant_id: 100,
      category_name: 'Uramaki',
      item_name: 'Philadelphia',
      variant_name: 'Inteiro',
      print_name: 'Phila lata',
      unit_price_cents: 3200,
      qty: 1,
      note: null,
      addons: [],
      total_cents: 3200,
    },
  ],
  subtotal_cents: 3200,
  delivery_fee_cents: 700,
  total_cents: 3900,
  pay_on_delivery: true,
  pay_method: 'cash',
  change_for_cents: 5000,
  change_cents: 1100,
};

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ');

describe('TicketPrint', () => {
  function setup(ticket: KitchenTicket | Bill, paperWidth: 58 | 80 = 80) {
    localStorage.clear();
    const fixture = TestBed.createComponent(TicketPrint);
    fixture.componentRef.setInput('ticket', ticket);
    fixture.componentRef.setInput('paperWidth', paperWidth);
    fixture.componentRef.setInput('restaurantName', 'Ukemochi');
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('prints the kitchen ticket without prices, flagged as updated', () => {
    const preview = text(setup(KITCHEN).nativeElement.querySelector('.lib-ticket'));

    expect(preview).toContain('ATUALIZADO v2');
    expect(preview).toContain('#42 · Amanda · No salão');
    expect(preview).toContain('2× Uramaki Philadelphia · Inteiro');
    expect(preview).toContain('+ Cream cheese');
    expect(preview).toContain('» sem cebolinha');
    expect(preview).toContain('mesa da janela');
    expect(preview).not.toContain('R$');
    expect(preview).not.toContain('Ukemochi');
  });

  it('prints a cancel ticket with its reason', () => {
    const preview = text(
      setup({
        ...KITCHEN,
        updated_version: null,
        cancelled: true,
        cancel_reason: 'desistiu',
      }).nativeElement.querySelector('.lib-ticket'),
    );

    expect(preview).toContain('CANCELADO');
    expect(preview).toContain('desistiu');
    expect(preview).not.toContain('ATUALIZADO');
  });

  it('prints the bill with the API totals and the change to take', () => {
    const preview = text(setup(BILL).nativeElement.querySelector('.lib-ticket'));

    expect(preview).toContain('Ukemochi');
    expect(preview).toContain('Rua A, 1');
    expect(preview).toContain('1× Phila lata');
    expect(preview).not.toContain('Uramaki');
    expect(preview).toMatch(/Total\s?R\$\s?39,00/);
    expect(preview).toMatch(/Troco para\s?R\$\s?50,00/);
    expect(preview).toMatch(/Troco\s?R\$\s?11,00/);
    expect(preview).toContain('Não é documento fiscal');
  });

  it('puts a copy of the ticket under body for printing and removes it on destroy', () => {
    const fixture = setup(KITCHEN, 58);
    const sheet = document.body.querySelector(':scope > .lib-ticket-sheet .lib-ticket');

    expect(sheet?.classList).toContain('lib-ticket-58');
    expect(text(sheet)).toContain('#42 · Amanda');

    fixture.destroy();
    expect(document.body.querySelector('.lib-ticket-sheet')).toBeNull();
  });

  it('sizes the page to the roll width before printing', () => {
    setup(KITCHEN, 58);
    window.dispatchEvent(new Event('beforeprint'));

    const page = [...document.head.querySelectorAll('style')].map((s) => s.textContent).join('');
    expect(page).toMatch(/@page \{ size: 58mm \d+mm; margin: 0 5mm; \}/);
  });
});
