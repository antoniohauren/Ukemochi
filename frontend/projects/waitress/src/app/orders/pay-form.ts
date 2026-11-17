import {
  type AbstractControl,
  FormControl,
  FormGroup,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  type Allocation,
  maxMoney,
  moneyValidator,
  parseMoney,
  type PaymentInput,
  type PaymentMethod,
} from 'shared';

// PaymentRequest: amount 1–100000000 cents, tendered (cash only) ≥ amount, payer_label max:255.
const MAX_CENTS = 100_000_000;

function positive(control: AbstractControl<string>): ValidationErrors | null {
  const cents = parseMoney(control.value);
  return cents !== null && cents <= 0 ? { positive: true } : null;
}

/** Tendered cash is optional; when given it must cover the amount. */
function tenderedCovers(group: AbstractControl): ValidationErrors | null {
  const v = (group as PayForm).getRawValue();
  if (v.method !== 'cash' || v.tendered.trim() === '') {
    return null;
  }
  const tendered = parseMoney(v.tendered);
  const amount = parseMoney(v.amount);
  return tendered === null || (amount !== null && tendered < amount) ? { tendered: true } : null;
}

export function payForm() {
  const text = () => new FormControl('', { nonNullable: true });
  return new FormGroup(
    {
      method: new FormControl<PaymentMethod>('pix', { nonNullable: true }),
      amount: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, moneyValidator, positive, maxMoney(MAX_CENTS)],
      }),
      tendered: text(),
      payer_label: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(255)],
      }),
    },
    { validators: tenderedCovers },
  );
}

export type PayForm = ReturnType<typeof payForm>;

/** Request body from a valid form; `allocations` come from the split preview. */
export function paymentInput(form: PayForm, allocations: Allocation[]): PaymentInput {
  const v = form.getRawValue();
  const cash = v.method === 'cash' && v.tendered.trim() !== '';
  return {
    method: v.method,
    amount_cents: parseMoney(v.amount) ?? 0,
    tendered_cents: cash ? parseMoney(v.tendered) : null,
    payer_label: v.payer_label.trim() || null,
    ...(allocations.length > 0 && { allocations }),
  };
}
