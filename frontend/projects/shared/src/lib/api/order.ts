export type OrderType = 'dine_in' | 'pickup' | 'delivery';

export type OrderStatus = 'open' | 'ready' | 'out_for_delivery' | 'closed' | 'cancelled';

/** `LineAddonResource`: add-on snapshot taken when the line was sent. */
export interface LineAddon {
  addon_id: number;
  name: string;
  price_cents: number;
}

/** `OrderLineResource`: names and prices are snapshots; `total_cents` = qty × (unit + add-ons). */
export interface OrderLine {
  id: number;
  variant_id: number;
  item_name: string;
  variant_name: string;
  unit_price_cents: number;
  qty: number;
  note: string | null;
  addons: LineAddon[];
  total_cents: number;
}

/**
 * `OrderResource`. `id` is the order number. Totals come from the API: show them as they are.
 * "Changed since print" is `version > printed_version`.
 */
export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  customer_id: number | null;
  customer_name: string;
  address_text: string | null;
  delivery_fee_cents: number;
  pay_on_delivery: boolean;
  change_for_cents: number | null;
  note: string | null;
  lines: OrderLine[];
  subtotal_cents: number;
  total_cents: number;
  created_by: number;
  /** ISO 8601 with offset. */
  created_at: string;
  closed_at: string | null;
  cancel_reason: string | null;
  printed_version: number;
  version: number;
}

/** `OrderListResource`: body of `GET /api/orders`, newest first. */
export interface OrderList {
  orders: Order[];
}

/** One line of an order body. `id` keeps an existing line on edit; leave it out for a new line. */
export interface LineInput {
  id?: number | null;
  variant_id: number;
  /** 1–999. */
  qty: number;
  note?: string | null;
  addon_ids?: number[];
}

/**
 * Body of `POST /api/orders`. `address_text` is required for delivery; `delivery_fee_cents` only on delivery.
 * Cents are integers 0–100000000; at most 200 lines.
 */
export interface OrderInput {
  type: OrderType;
  customer_name: string;
  address_text?: string | null;
  delivery_fee_cents?: number;
  pay_on_delivery?: boolean;
  change_for_cents?: number | null;
  note?: string | null;
  lines: LineInput[];
}

/** Body of `PUT /api/orders/{id}`: the whole order. Lines left out are removed; `edit_note` goes to the audit log. */
export interface OrderEditInput extends OrderInput {
  edit_note?: string | null;
}

/** Private channel and event the API broadcasts after each order change; refetch the order on it. */
export const ORDERS_CHANNEL = 'orders';
/** Leading dot: Echo takes the name as is, without the event namespace. */
export const ORDER_UPDATED_EVENT = '.order.updated';

/** Payload of `order.updated`. */
export interface OrderUpdated {
  id: number;
  version: number;
}
