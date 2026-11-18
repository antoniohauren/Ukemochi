import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  type ElementRef,
  inject,
  input,
  TemplateRef,
  viewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import { DomPortalOutlet, TemplatePortal } from '@angular/cdk/portal';
import type { OrderType, PaymentMethod, Ticket } from '../api/order';
import type { PaperWidth } from '../api/settings';
import { LanguageService } from '../i18n/language';
import { TPipe } from '../i18n/t.pipe';
import { formatMoney } from '../money/money';
import { lineName } from './order-draft';

/** Printable width inside the roll's margins, in mm. */
const PRINTABLE: Record<PaperWidth, number> = { 58: 48, 80: 72 };
const PX_PER_MM = 96 / 25.4;
/** Paper fed after the last line, in mm, so the cutter does not cut through it. */
const FEED_MM = 10;

/**
 * Kitchen ticket or customer bill as it prints: monospace, roll width from the settings.
 * Shows a preview in place; a copy sits under `<body>`, the only thing a print shows, and `@page`
 * gets the roll width and the ticket's own height so the roll prints one page with no blank tail.
 */
@Component({
  selector: 'lib-ticket-print',
  imports: [NgTemplateOutlet, TPipe],
  // Global styles: the print copy lives outside this component, directly under <body>.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeprint)': 'fitPage()' },
  template: `
    <ng-template #sheet>
      <div
        class="lib-ticket"
        [class.lib-ticket-58]="paperWidth() === 58"
        [attr.data-kind]="ticket().kind"
      >
        @let t = ticket();
        <header class="lib-ticket-center">
          <p class="lib-ticket-big">{{ restaurantName() }} #{{ t.number }}</p>
          <p class="lib-ticket-big">
            {{ t.customer_name }}{{ t.phone_last4 ? ' - ' + t.phone_last4 : '' }}
          </p>
          <p>{{ typeKey(t.type) | t }}</p>
          <p class="lib-ticket-nowrap">{{ when(t.created_at) }}</p>
        </header>
        @if (t.cancelled) {
          <p class="lib-ticket-flag">{{ 'ticket.cancelled' | t }}</p>
        }
        @if (t.kind === 'kitchen' && t.cancel_reason) {
          <p>{{ 'order.cancel.reason' | t }}: {{ t.cancel_reason }}</p>
        }
        <hr />
        <!-- Same content on both tickets, for now. -->
        @for (row of rows(); track $index) {
          <div class="lib-ticket-item">
            <p class="lib-ticket-item-title">{{ row.title }}</p>
            @for (addon of row.addons; track $index) {
              <p class="lib-ticket-sub">+ {{ addon }}</p>
            }
            @if (row.note) {
              <p class="lib-ticket-sub">» {{ row.note }}</p>
            }
            <p class="lib-ticket-price">{{ money(row.totalCents) }}</p>
          </div>
        }
        <hr />
        @if (t.pay_on_delivery && t.pay_method) {
          <p class="lib-ticket-center">{{ methodKey(t.pay_method) | t }}</p>
          <!-- Only cash has a "troco para". -->
          @if (t.change_for_cents !== null) {
            <p class="lib-ticket-center">
              {{ 'order.change_for' | t }} {{ money(t.change_for_cents) }}
            </p>
          }
          <hr />
        }
        @if (t.delivery_fee_cents > 0) {
          <p class="lib-ticket-row">
            <span>{{ 'order.subtotal' | t }}</span><span>{{ money(t.subtotal_cents) }}</span>
          </p>
          <p class="lib-ticket-row">
            <span>{{ 'order.delivery_fee' | t }}</span><span>{{
              money(t.delivery_fee_cents)
            }}</span>
          </p>
        }
        <p class="lib-ticket-row lib-ticket-big">
          <span>{{ 'order.total' | t }}</span><span>{{ money(t.total_cents) }}</span>
        </p>
        @if (t.kind === 'bill' && t.payments.length > 0) {
          <hr />
          @for (p of t.payments; track $index) {
            <p class="lib-ticket-row">
              <span
                >{{ methodKey(p.method) | t }}
                @if (p.payer_label) {
                  · {{ p.payer_label }}
                }</span
              ><span>{{ money(p.amount_cents) }}</span>
            </p>
            @if (p.change_cents !== null && p.change_cents > 0) {
              <p class="lib-ticket-row">
                <span>{{ 'ticket.change' | t }}</span><span>{{ money(p.change_cents) }}</span>
              </p>
            }
          }
          <p class="lib-ticket-row lib-ticket-big">
            <span>{{
              (t.balance_cents < 0 ? 'payment.overpaid' : 'payment.balance') | t
            }}</span><span>{{ money(abs(t.balance_cents)) }}</span>
          </p>
        }
        @if (t.note) {
          <hr />
          <p>{{ 'order.note' | t }}: {{ t.note }}</p>
        }
        <p class="lib-ticket-center">
          {{ (t.kind === 'bill' ? 'ticket.thanks' : 'ticket.kitchen') | t }}
        </p>
        @if (t.kind === 'kitchen' && t.updated_version !== null) {
          <hr />
          <p class="lib-ticket-center">{{ 'ticket.updated' | t }} v{{ t.updated_version }}</p>
        }
      </div>
    </ng-template>
    <div #preview class="lib-ticket-preview">
      <ng-container [ngTemplateOutlet]="sheet" />
    </div>
  `,
  styles: `
    .lib-ticket {
      box-sizing: border-box;
      width: 72mm;
      padding: 2mm 0;
      font-family: ui-monospace, 'DejaVu Sans Mono', 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
      overflow-wrap: anywhere;
      p {
        margin: 0;
      }
      hr {
        border: 0;
        border-top: 1px dashed currentColor;
        margin: 2mm 0;
      }
    }
    .lib-ticket-58 {
      width: 48mm;
      font-size: 11px;
    }
    .lib-ticket-big {
      font-size: 1.25em;
      font-weight: bold;
    }
    .lib-ticket-item {
      font-size: 12px;
      & + & {
        margin-top: 1.5mm;
      }
    }
    .lib-ticket-item-title {
      font-weight: bold;
    }
    .lib-ticket-sub {
      padding-inline-start: 2ch;
    }
    .lib-ticket-price {
      white-space: nowrap;
    }
    .lib-ticket-flag {
      margin: 1mm 0;
      padding: 1mm;
      font-size: 1.5em;
      font-weight: bold;
      border: 2px solid currentColor;
    }
    .lib-ticket-center {
      text-align: center;
    }
    .lib-ticket-nowrap {
      white-space: nowrap;
    }
    .lib-ticket-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1ch;
      > :first-child {
        min-width: 0;
      }
      /* The amount never splits ("R$ 36 / ,00"). */
      > :last-child {
        flex-shrink: 0;
        white-space: nowrap;
      }
    }
    .lib-ticket-preview {
      display: flex;
      justify-content: center;
      overflow-x: auto;
      .lib-ticket {
        padding: 4mm 3mm;
        width: calc(72mm + 6mm);
        background: var(--mat-sys-surface-container-lowest);
        color: var(--mat-sys-on-surface);
        border-radius: var(--mat-sys-corner-small);
      }
      .lib-ticket-58 {
        width: calc(48mm + 6mm);
      }
    }
    .lib-ticket-sheet {
      display: none;
    }
    @media print {
      body > :not(.lib-ticket-sheet) {
        display: none !important;
      }
      .lib-ticket-sheet {
        display: block;
        background: #fff;
        color: #000;
        .lib-ticket {
          margin: 0 auto;
        }
      }
    }
  `,
})
export class TicketPrint {
  readonly ticket = input.required<Ticket>();
  readonly paperWidth = input.required<PaperWidth>();
  /** Bill header. */
  readonly restaurantName = input('');

  private readonly sheet = viewChild.required('sheet', { read: TemplateRef });
  private readonly preview = viewChild.required<ElementRef<HTMLElement>>('preview');
  private readonly lang = inject(LanguageService).lang;
  private readonly page: HTMLStyleElement;

  constructor() {
    const doc = inject(DOCUMENT);
    const vcr = inject(ViewContainerRef);
    const host = doc.createElement('div');
    host.className = 'lib-ticket-sheet';
    this.page = doc.createElement('style');
    doc.body.append(host);
    doc.head.append(this.page);
    const outlet = new DomPortalOutlet(host);
    afterNextRender(() => outlet.attach(new TemplatePortal(this.sheet(), vcr)));
    inject(DestroyRef).onDestroy(() => {
      outlet.dispose();
      host.remove();
      this.page.remove();
    });
  }

  /** Before each print: roll width × the ticket's height (measured on the preview, same content). */
  protected fitPage(): void {
    const width = this.paperWidth();
    const ticket = this.preview().nativeElement.querySelector('.lib-ticket');
    const contentMm = (ticket?.scrollHeight ?? 0) / PX_PER_MM;
    const height = Math.ceil(contentMm + FEED_MM);
    this.page.textContent = `@page { size: ${width}mm ${height}mm; margin: 0 ${(width - PRINTABLE[width]) / 2}mm; }`;
  }

  protected abs(cents: number): number {
    return Math.abs(cents);
  }

  /** "01x Name", add-on names, note and line total. */
  protected readonly rows = computed(() => {
    const t = this.ticket();
    return t.lines.map((line) => ({
      title: `${String(line.qty).padStart(2, '0')}x ${lineName(line)}`,
      addons: line.addons.map((a) => a.name),
      note: line.note,
      totalCents: line.total_cents,
    }));
  });

  protected typeKey(type: OrderType) {
    return `order.type.${type}` as const;
  }

  protected methodKey(method: PaymentMethod) {
    return `payment.method.${method}` as const;
  }

  protected when(iso: string): string {
    const at = new Date(iso);
    const date = new Intl.DateTimeFormat(this.lang(), { dateStyle: 'short' }).format(at);
    const time = new Intl.DateTimeFormat(this.lang(), { timeStyle: 'short' }).format(at);
    return `${date} ${time}`;
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
