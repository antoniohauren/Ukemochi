/** One change-log row. `user_name` is null for system actions. `summary` is what changed (free JSON). */
export interface AuditEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  at: string;
  entity: string;
  entity_id: string;
  action: string;
  summary: unknown;
  note: string | null;
}

/** `AuditPageResource`: newest first, 50 a page; pass `next_before` as `before` for the next page. */
export interface AuditPage {
  entries: AuditEntry[];
  next_before: number | null;
}

export interface AuditQuery {
  entity?: string;
  entity_id?: string;
  before?: number;
}
