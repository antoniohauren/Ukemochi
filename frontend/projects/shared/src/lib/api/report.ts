import type { PaymentMethod } from './order';

export interface ReportItemRow {
  item_name: string;
  variant_name: string;
  qty: number;
  amount_cents: number;
}

export interface ReportMethodRow {
  method: PaymentMethod;
  count: number;
  amount_cents: number;
}

export interface ReportWaitressRow {
  user_id: number;
  user_name: string | null;
  orders_count: number;
  revenue_cents: number;
}

/**
 * `ReportResource`: body of `GET /api/reports?from&to` (admin), sales in [from, to).
 * Orders count by creation time without cancelled ones; payments by payment time without voided ones.
 * Rows sorted by amount, largest first.
 */
export interface Report {
  from: string;
  to: string;
  orders_count: number;
  cancelled_count: number;
  revenue_cents: number;
  by_item: ReportItemRow[];
  by_method: ReportMethodRow[];
  by_waitress: ReportWaitressRow[];
}

/** `BackupListResource` row: a `pg_dump` custom-format file (restore with `pg_restore`). */
export interface Backup {
  name: string;
  size_bytes: number;
  created_at: string;
}

export interface BackupList {
  backups: Backup[];
}
