import type { Order, PaymentMethod } from './order';

/** `PaymentResource`. Stored at the amount applied; `change_cents` = tendered − amount, cash only. */
export interface Payment {
  id: number;
  order_id: number;
  shift_id: number;
  method: PaymentMethod;
  amount_cents: number;
  tendered_cents: number | null;
  change_cents: number | null;
  payer_label: string | null;
  note: string | null;
  created_by: number;
  created_at: string;
  voided: boolean;
}

/** `OrderPaymentsResource`: the order and all its payments, voided ones included, oldest first. */
export interface OrderPayments {
  order: Order;
  payments: Payment[];
}

/** Body of `POST /api/orders/{id}/payments`. `tendered_cents` only for cash and ≥ amount. */
export interface PaymentInput {
  method: PaymentMethod;
  amount_cents: number;
  tendered_cents?: number | null;
  payer_label?: string | null;
  note?: string | null;
}
