import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { type CustomerAddress, phoneDigits, validPhone } from '../../api/customer';
import { type OrderType, type PaymentMethod } from '../../api/order';
import { LanguageService } from '../../i18n/language';
import { type TranslationKey } from '../../i18n/pt-br';
import { TPipe } from '../../i18n/t.pipe';
import { formatMoney } from '../../money/money';
import { addonOptions, draftTotal, newLine } from '../../orders/order-draft';
import { OrderLines } from '../../orders/order-lines';
import { CustomerLookup } from './customer-lookup';
import { LineSheet, type LineSheetData, type LineSheetResult } from './line-sheet';
import { MenuPickerSheet } from './menu-picker-sheet';
import { OrderEditorStore } from './order-editor-store';
import { applyCustomer, feeCents, orderForm, orderFormValue } from './order-form';

const TYPES: readonly OrderType[] = ['dine_in', 'pickup', 'delivery'];
const METHODS: readonly PaymentMethod[] = ['cash', 'credit', 'debit', 'pix'];

/** New order (Novo tab) or edit of a saved one (`/orders/:id/edit`). Lines are picked in bottom sheets. */
@Component({
  selector: 'lib-order-editor-page',
  providers: [OrderEditorStore, CustomerLookup],
  imports: [
    MatButton,
    MatIconButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatError,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    MatSlideToggle,
    MatSuffix,
    OrderLines,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.menu()) {
      <form class="fields" [formGroup]="form" (ngSubmit)="submit()">
        <mat-button-toggle-group
          hideSingleSelectionIndicator
          formControlName="type"
          class="types"
          [attr.aria-label]="'order.type' | t"
        >
          @for (type of types; track type) {
            <mat-button-toggle [value]="type">{{ typeKey(type) | t }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
        @if (value().type !== 'dine_in') {
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>{{ 'customer.phone' | t }}</mat-label>
            <input
              matInput
              [formControl]="phone"
              type="tel"
              inputmode="tel"
              maxlength="30"
              autocomplete="off"
              (keydown.enter)="$event.preventDefault(); findCustomer()"
            />
            <button
              matIconButton
              matSuffix
              type="button"
              [attr.aria-label]="'customer.lookup' | t"
              (click)="findCustomer()"
            >
              <mat-icon aria-hidden="true">search</mat-icon>
            </button>
            <mat-error>{{ 'customer.phone.invalid' | t }}</mat-error>
          </mat-form-field>
          @if (lookup.error(); as key) {
            <p class="error" role="alert">{{ key | t }}</p>
          }
          @if (lookup.missing()) {
            <p class="hint" role="status">{{ 'customer.not_found' | t }}</p>
            <button matButton="tonal" type="button" (click)="saveCustomer()">
              {{ 'customer.save' | t }}
            </button>
          }
        }
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ 'order.customer_name' | t }}</mat-label>
          <input matInput formControlName="customer_name" maxlength="255" autocomplete="off" />
          <mat-error>{{ 'order.customer_name.required' | t }}</mat-error>
        </mat-form-field>
        @if (value().type === 'delivery') {
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>{{ 'order.address' | t }}</mat-label>
            <textarea matInput formControlName="address_text" rows="2" maxlength="1000"></textarea>
            <mat-error>{{ 'order.address.required' | t }}</mat-error>
          </mat-form-field>
          @if ((lookup.customer()?.addresses?.length ?? 0) > 1) {
            <div class="addresses">
              @for (a of lookup.customer()?.addresses; track $index) {
                <button matButton="outlined" type="button" (click)="pickAddress(a)">
                  {{ a.text }}
                </button>
              }
            </div>
          }
          @if (store.showFee()) {
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ 'order.delivery_fee' | t }}</mat-label>
              <input
                matInput
                formControlName="delivery_fee"
                inputmode="decimal"
                autocomplete="off"
              />
              <mat-error>{{ 'menu.price.invalid' | t }}</mat-error>
            </mat-form-field>
          }
          <mat-slide-toggle formControlName="pay_on_delivery">
            {{ 'order.pay_on_delivery' | t }}
          </mat-slide-toggle>
          @if (value().pay_on_delivery) {
            <mat-button-toggle-group
              hideSingleSelectionIndicator
              formControlName="pay_method"
              class="methods"
              [attr.aria-label]="'order.pay_method' | t"
            >
              @for (method of methods; track method) {
                <mat-button-toggle [value]="method">{{ methodKey(method) | t }}</mat-button-toggle>
              }
            </mat-button-toggle-group>
          }
          @if (value().pay_on_delivery && value().pay_method === 'cash') {
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ 'order.change_for' | t }}</mat-label>
              <input matInput formControlName="change_for" inputmode="decimal" autocomplete="off" />
              <mat-error>{{ 'menu.price.invalid' | t }}</mat-error>
            </mat-form-field>
          }
        }

        <h2 class="label">{{ 'order.lines' | t }}</h2>
        <lib-order-lines [lines]="store.views()" selectable (selectLine)="editLine($event)" />
        <button matButton="tonal" type="button" class="add" (click)="addLine()">
          <mat-icon aria-hidden="true">add</mat-icon>
          {{ 'order.add_line' | t }}
        </button>

        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ 'order.note' | t }}</mat-label>
          <textarea matInput formControlName="note" rows="2" maxlength="1000"></textarea>
          <mat-error>{{ 'menu.note.invalid' | t }}</mat-error>
        </mat-form-field>
        @if (error(); as key) {
          <p class="error" role="alert">{{ key | t }}</p>
        }
        <div class="action-bar">
          <span class="total">{{ money(total()) }}</span>
          <button matButton="filled" type="submit" [disabled]="busy()">
            {{ (store.order() ? 'order.save' : 'order.send') | t }}
          </button>
        </div>
      </form>
    } @else if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
      <button matButton="tonal" type="button" (click)="store.load(id)">
        {{ 'common.retry' | t }}
      </button>
    } @else {
      <div class="skeleton" aria-hidden="true">
        @for (row of [1, 2, 3]; track row) {
          <span class="bar"></span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .fields {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 12px;
      max-width: 600px;
    }
    .types,
    .methods {
      align-self: stretch;
      mat-button-toggle {
        flex: 1;
      }
    }
    .types {
      margin-bottom: 12px;
    }
    .label {
      margin: 8px 0 0;
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .add {
      align-self: flex-start;
      min-height: 48px;
    }
    .hint {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .addresses {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }
    .action-bar {
      position: sticky;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-top: auto;
      padding: 8px 0;
      background: var(--mat-sys-surface);
      button {
        min-height: 48px;
      }
    }
    .total {
      font: var(--mat-sys-title-large);
    }
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: 12px;
      .bar {
        height: 56px;
        border-radius: var(--mat-sys-corner-small);
        background: var(--mat-sys-surface-container-high);
      }
    }
  `,
})
export class OrderEditorPage {
  protected readonly store = inject(OrderEditorStore);
  private readonly sheet = inject(MatBottomSheet);
  private readonly lang = inject(LanguageService).lang;
  protected readonly types = TYPES;
  protected readonly methods = METHODS;
  protected readonly id = ((id) => (id === null ? null : Number(id)))(
    inject(ActivatedRoute).snapshot.paramMap.get('id'),
  );

  // New orders and saved non-delivery ones get the settings' fee when switched to delivery.
  protected readonly form = orderForm(() =>
    formatMoney(this.store.defaultFeeCents(), untracked(this.lang)),
  );
  protected readonly value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  protected readonly total = computed(() => draftTotal(this.store.lines(), feeCents(this.value())));
  protected readonly lookup = inject(CustomerLookup);
  protected readonly phone = new FormControl('', {
    nonNullable: true,
    validators: (c) => (validPhone(c.value) ? null : { phone: true }),
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<TranslationKey | null>(null);

  constructor() {
    // A saved order fills the form once loaded.
    effect(() => {
      const order = this.store.order();
      if (order) {
        this.form.setValue(orderFormValue(order, untracked(this.lang))); // a language switch must not reset input
      }
    });
    void this.store.load(this.id);
  }

  protected methodKey(method: PaymentMethod) {
    return `payment.method.${method}` as const;
  }

  protected typeKey(type: OrderType) {
    return `order.type.${type}` as const;
  }

  protected addLine(): void {
    const menu = this.store.orderable();
    if (!menu) {
      return;
    }
    this.sheet
      .open<MenuPickerSheet, { menu: typeof menu }, number>(MenuPickerSheet, { data: { menu } })
      .afterDismissed()
      .subscribe((variantId) => {
        const entry = variantId === undefined ? null : this.store.entry(variantId);
        if (entry) {
          const line = newLine(entry);
          this.openLine({ line, options: addonOptions(entry, []), removable: false }, (result) =>
            this.store.add(result),
          );
        }
      });
  }

  protected editLine(index: number): void {
    const line = this.store.lines()[index];
    const options = addonOptions(this.store.entry(line.variant_id), line.addons);
    this.openLine(
      { line, options, removable: true },
      (result) => this.store.replace(index, result),
      () => this.store.remove(index),
    );
  }

  private openLine(
    data: LineSheetData,
    save: (line: NonNullable<Exclude<LineSheetResult, 'remove'>>) => void,
    remove?: () => void,
  ): void {
    this.sheet
      .open<LineSheet, LineSheetData, LineSheetResult>(LineSheet, { data })
      .afterDismissed()
      .subscribe((result) => {
        if (result === 'remove') {
          remove?.();
        } else if (result) {
          save(result);
        }
      });
  }

  protected async findCustomer(): Promise<void> {
    if (this.phone.invalid) {
      this.phone.markAsTouched();
      return;
    }
    const customer = await this.lookup.find(this.phone.value);
    if (customer) {
      applyCustomer(this.form, customer);
    }
  }

  /** Saves the caller with the typed name, phone and (on delivery) address, and links them to the order. */
  protected async saveCustomer(): Promise<void> {
    const v = this.form.getRawValue();
    const name = this.form.controls.customer_name;
    if (this.phone.invalid || name.invalid) {
      this.phone.markAsTouched();
      name.markAsTouched();
      return;
    }
    const address = v.type === 'delivery' ? v.address_text.trim() : '';
    const customer = await this.lookup.save({
      name: v.customer_name.trim(),
      phone: phoneDigits(this.phone.value),
      note: null,
      addresses: address ? [{ text: address }] : [],
    });
    if (customer) {
      applyCustomer(this.form, customer);
    }
  }

  protected pickAddress(a: CustomerAddress): void {
    this.form.controls.address_text.setValue(a.text);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(await this.store.submit(this.form.getRawValue()));
    this.busy.set(false);
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
