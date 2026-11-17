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
  /** Line units this payment covered (split by units or goods). */
  allocations: Allocation[];
}

/** `qty` of a line: "2", "1/2", "1/3"; exact. */
export interface Allocation {
  line_id: number;
  qty: string;
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
  allocations?: Allocation[];
}

/**
 * Body of `POST /api/orders/{id}/split` (preview over the balance due). `equal`: `n` 1–50.
 * `amount`: amounts for the first payers, one more takes the rest. `units`: picks per payer
 * (qty "1", "0.5", "1/3"). `goods`: whole lines per payer.
 */
export type SplitInput =
  | { mode: 'equal'; n: number }
  | { mode: 'amount'; amounts: number[] }
  | { mode: 'units'; payers: { label?: string | null; picks: Allocation[] }[] }
  | { mode: 'goods'; payers: { label?: string | null; line_ids: number[] }[] };

export interface SplitShare {
  payer_label: string | null;
  amount_cents: number;
  /** Send back with the payment; empty for `equal` and `amount`. */
  allocations: Allocation[];
}

/** `SplitResource`. `remainder_cents` = balance − Σ shares: what nobody covers yet. */
export interface SplitResult {
  shares: SplitShare[];
  remainder_cents: number;
}
