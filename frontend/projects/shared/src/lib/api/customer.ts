import type { FormControl } from '@angular/forms';

/** An address of `CustomerResource`. */
export interface CustomerAddress {
  text: string;
  note: string | null;
}

/** `CustomerResource`. `phone` holds digits only. */
export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  note: string | null;
  addresses: CustomerAddress[];
}

/** `CustomerListResource`: body of `GET /api/customers?q=`, ordered by name. */
export interface CustomerList {
  customers: Customer[];
}

/** Body of `POST /api/customers` and `PUT /api/customers/{id}`; addresses are replaced. */
export interface CustomerInput {
  name: string;
  phone: string | null;
  note: string | null;
  addresses: { text: string; note?: string | null }[];
}

/** Keeps the digits, as the API stores them: "(11) 98765-4321" is "11987654321". */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** The API's rule for new and edited phones: 11 digits. */
export function validPhone(phone: string): boolean {
  return /^\d{11}$/.test(phoneDigits(phone));
}

/** "88888888888" as "(88) 8.8888-8888"; a partial number gets only the separators before its digits, so backspace works. */
export function formatPhone(phone: string): string {
  const d = phoneDigits(phone).slice(0, 11);
  if (d === '') return '';
  let out = `(${d.slice(0, 2)}`;
  if (d.length > 2) out += `) ${d[2]}`;
  if (d.length > 3) out += `.${d.slice(3, 7)}`;
  if (d.length > 7) out += `-${d.slice(7)}`;
  return out;
}

/** Keeps a phone control masked as "(88) 8.8888-8888" while typing. */
export function maskPhone(control: FormControl<string>): FormControl<string> {
  control.valueChanges.subscribe((v) => {
    const masked = formatPhone(v);
    if (masked !== v) control.setValue(masked, { emitEvent: false });
  });
  return control;
}
