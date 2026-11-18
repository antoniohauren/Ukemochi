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

/** The API's rule: 8 to 15 digits. */
export function validPhone(phone: string): boolean {
  return /^\d{8,15}$/.test(phoneDigits(phone));
}
