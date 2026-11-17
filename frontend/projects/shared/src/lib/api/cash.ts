import type { PaymentMethod } from './order';

/** A staff meal leaves the drawer like a withdrawal and keeps the staff name. */
export type MovementKind = 'withdrawal' | 'deposit' | 'staff_meal';

export interface CashMovement {
  id: number;
  kind: MovementKind;
  amount_cents: number;
  /** Only on a staff meal. */
  staff_name: string | null;
  note: string | null;
  created_by: number;
  created_at: string;
}

/**
 * `ShiftResource`. Money comes from the API: expected = float + cash payments − withdrawals − staff meals
 * + deposits; `difference_cents` = counted − expected, null while open.
 */
export interface Shift {
  id: number;
  opened_by: number;
  opened_at: string;
  opening_float_cents: number;
  closed_by: number | null;
  closed_at: string | null;
  counted_cents: number | null;
  note: string | null;
  movements: CashMovement[];
  totals_by_method: Record<PaymentMethod, number>;
  withdrawals_cents: number;
  staff_meals_cents: number;
  deposits_cents: number;
  expected_cents: number;
  difference_cents: number | null;
}

export interface CashMovementInput {
  kind: MovementKind;
  amount_cents: number;
  staff_name?: string | null;
  note?: string | null;
}
