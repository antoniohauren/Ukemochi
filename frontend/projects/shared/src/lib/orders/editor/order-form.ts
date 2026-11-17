import {
  type AbstractControl,
  FormControl,
  FormGroup,
  type ValidationErrors,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { type Order, type OrderInput, type OrderType, type PaymentMethod } from '../../api/order';
import { type Lang } from '../../i18n/language';
import { formatMoney, maxMoney, moneyValidator, parseMoney } from '../../money/money';
import { type DraftLine, lineInput } from '../../orders/order-draft';

// OrderRequest: cents max:100000000, text max:1000, customer_name max:255.
const MAX_CENTS = 100_000_000;

/** Applies `validator` only on delivery orders, so hidden delivery fields never block the others. */
function onDelivery(validator: ValidatorFn): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.parent?.get('type')?.value === 'delivery' ? validator(control) : null;
}

/** Applies `validator` only while change is asked for (delivery + pay on delivery in cash), when the field shows. */
function onCashOnDelivery(validator: ValidatorFn): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.parent?.get('pay_on_delivery')?.value === true &&
    control.parent.get('pay_method')?.value === 'cash'
      ? onDelivery(validator)(control)
      : null;
}

/** Empty means "no change needed"; otherwise a valid amount. */
function optionalMoney(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() === '' ? null : moneyValidator(control);
}

/**
 * Order details form; rules mirror OrderRequest + OrderDetails (address required for delivery).
 * `defaultFee` (formatted) fills the fee when the type becomes delivery and no fee is set yet.
 */
export function orderForm(defaultFee: () => string = () => '') {
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
    pay_method: new FormControl<PaymentMethod>('cash', { nonNullable: true }),
    change_for: text([onCashOnDelivery(optionalMoney), onCashOnDelivery(maxMoney(MAX_CENTS))]),
    note: text([Validators.maxLength(1000)]),
  });
  // Delivery-only rules depend on the type: re-check them when it changes.
  form.controls.type.valueChanges.subscribe((type) => {
    const fee = form.controls.delivery_fee;
    if (type === 'delivery' && !parseMoney(fee.value)) {
      fee.setValue(defaultFee(), { emitEvent: false });
    }
    for (const name of ['address_text', 'delivery_fee', 'change_for'] as const) {
      form.controls[name].updateValueAndValidity({ emitEvent: false });
    }
  });
  const recheckChange = () => form.controls.change_for.updateValueAndValidity({ emitEvent: false });
  form.controls.pay_on_delivery.valueChanges.subscribe(recheckChange);
  form.controls.pay_method.valueChanges.subscribe(recheckChange);
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
    pay_method: order.pay_method ?? 'cash',
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
  const cash = payOnDelivery && v.pay_method === 'cash';
  return {
    type: v.type,
    customer_name: v.customer_name.trim(),
    address_text: delivery ? v.address_text.trim() : null,
    delivery_fee_cents: feeCents(v),
    pay_on_delivery: payOnDelivery,
    pay_method: payOnDelivery ? v.pay_method : null,
    change_for_cents: cash && v.change_for.trim() ? parseMoney(v.change_for) : null,
    note: v.note.trim() || null,
    lines: lines.map(lineInput),
  };
}
