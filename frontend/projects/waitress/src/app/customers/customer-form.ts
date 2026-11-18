import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import {
  type Customer,
  type CustomerAddress,
  type CustomerInput,
  phoneDigits,
  validPhone,
} from 'shared';

// CustomerRequest: name max:255, phone 8–15 digits (max:30 typed), text max:1000, at most 20 addresses.
export const MAX_ADDRESSES = 20;

const text = (validators = [Validators.maxLength(1000)]) =>
  new FormControl('', { nonNullable: true, validators });

export function addressGroup(a?: CustomerAddress) {
  const group = new FormGroup({
    text: text([Validators.required, Validators.pattern(/\S/), Validators.maxLength(1000)]),
    note: text(),
  });
  if (a) {
    group.setValue({ text: a.text, note: a.note ?? '' });
  }
  return group;
}

/** Customer profile form; rules mirror CustomerRequest + Customer (phone optional, 8–15 digits). */
export function customerForm(c?: Customer) {
  const form = new FormGroup({
    name: text([Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]),
    phone: new FormControl('', {
      nonNullable: true,
      validators: (ctl) => (ctl.value === '' || validPhone(ctl.value) ? null : { phone: true }),
    }),
    note: text(),
    addresses: new FormArray((c?.addresses ?? []).map(addressGroup)),
  });
  if (c) {
    form.patchValue({ name: c.name, phone: c.phone ?? '', note: c.note ?? '' });
  }
  return form;
}

export type CustomerForm = ReturnType<typeof customerForm>;

export function customerBody(v: ReturnType<CustomerForm['getRawValue']>): CustomerInput {
  return {
    name: v.name.trim(),
    phone: v.phone.trim() ? phoneDigits(v.phone) : null,
    note: v.note.trim() || null,
    addresses: v.addresses.map((a) => ({ text: a.text.trim(), note: a.note.trim() || null })),
  };
}
