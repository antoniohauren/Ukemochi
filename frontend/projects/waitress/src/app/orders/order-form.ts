import {
  type AbstractControl,
  FormControl,
  FormGroup,
  type ValidationErrors,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  type DraftLine,
  formatMoney,
  type Lang,
  lineInput,
  maxMoney,
  moneyValidator,
  type Order,
  type OrderInput,
  type OrderType,
  parseMoney,
} from 'shared';

// OrderRequest: cents max:100000000, text max:1000, customer_name max:255.
const MAX_CENTS = 100_000_000;

/** Applies `validator` only on delivery orders, so hidden delivery fields never block the others. */
function onDelivery(validator: ValidatorFn): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.parent?.get('type')?.value === 'delivery' ? validator(control) : null;
}

/** Empty means "no change needed"; otherwise a valid amount. */
function optionalMoney(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() === '' ? null : moneyValidator(control);
}

/** Order details form; rules mirror OrderRequest + OrderDetails (address required for delivery). */
export function orderForm() {
  const text = (validators: ValidatorFn[] = []) =>
    new FormControl('', { nonNullable: true, validators });
  const form = new FormGroup({
    type: new FormControl<OrderType>('dine_in', { nonNullable: true }),
    customer_name: text([Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]),
    address_text: text([
      onDelivery(Validators.required),
      onDelivery(Validators.pattern(/\S/)),
      Validators.maxLength(1000),
    ]),
    delivery_fee: text([onDelivery(moneyValidator), onDelivery(maxMoney(MAX_CENTS))]),
    pay_on_delivery: new FormControl(false, { nonNullable: true }),
    change_for: text([onDelivery(optionalMoney), onDelivery(maxMoney(MAX_CENTS))]),
    note: text([Validators.maxLength(1000)]),
  });
  // Delivery-only rules depend on the type: re-check them when it changes.
  form.controls.type.valueChanges.subscribe(() => {
    for (const name of ['address_text', 'delivery_fee', 'change_for'] as const) {
      form.controls[name].updateValueAndValidity({ emitEvent: false });
    }
  });
  return form;
}

export type OrderForm = ReturnType<typeof orderForm>;
export type OrderFormValue = ReturnType<OrderForm['getRawValue']>;

/** Form value of a saved order, for editing. */
export function orderFormValue(order: Order, lang: Lang): OrderFormValue {
  return {
    type: order.type,
    customer_name: order.customer_name,
    address_text: order.address_text ?? '',
    delivery_fee: formatMoney(order.delivery_fee_cents, lang),
    pay_on_delivery: order.pay_on_delivery,
    change_for: order.change_for_cents === null ? '' : formatMoney(order.change_for_cents, lang),
    note: order.note ?? '',
  };
}

/** The fee that applies: only delivery orders carry one. */
export function feeCents(v: OrderFormValue): number {
  return v.type === 'delivery' ? (parseMoney(v.delivery_fee) ?? 0) : 0;
}

/** `POST/PUT /api/orders` body. Delivery-only fields are cleared on the other types. */
export function orderBody(v: OrderFormValue, lines: readonly DraftLine[]): OrderInput {
  const delivery = v.type === 'delivery';
  const payOnDelivery = delivery && v.pay_on_delivery;
  return {
    type: v.type,
    customer_name: v.customer_name.trim(),
    address_text: delivery ? v.address_text.trim() : null,
    delivery_fee_cents: feeCents(v),
    pay_on_delivery: payOnDelivery,
    change_for_cents: payOnDelivery && v.change_for.trim() ? parseMoney(v.change_for) : null,
    note: v.note.trim() || null,
    lines: lines.map(lineInput),
  };
}
