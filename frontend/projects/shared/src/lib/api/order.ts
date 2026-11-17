export type OrderType = 'dine_in' | 'pickup' | 'delivery';

/** How a payment is made; pix is recorded only. */
export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

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
  category_name: string;
  item_name: string;
  variant_name: string;
  /** Variant print name snapshot; tickets print it in place of "category item · variant". */
  print_name: string | null;
  unit_price_cents: number;
  qty: number;
  note: string | null;
  addons: LineAddon[];
  total_cents: number;
}

/**
 * What the kitchen ticket still needs: never printed, changed since the last print, or a cancel the
 * kitchen has not got yet. Null: nothing to print.
 */
export type PrintStatus = 'not_printed' | 'changed' | 'cancel_not_printed';

/**
 * `OrderResource`. `id` is the order number. Totals come from the API: show them as they are.
 * `printed_version` is the last version whose kitchen ticket was printed.
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
  /** Set only with `pay_on_delivery`. */
  pay_method: PaymentMethod | null;
  /** Only for cash. */
  change_for_cents: number | null;
  note: string | null;
  lines: OrderLine[];
  subtotal_cents: number;
  total_cents: number;
  /** Σ non-voided payments. */
  paid_cents: number;
  /** total − paid; negative when overpaid. */
  balance_cents: number;
  created_by: number;
  /** ISO 8601 with offset. */
  created_at: string;
  closed_at: string | null;
  cancel_reason: string | null;
  printed_version: number;
  version: number;
  print_status: PrintStatus | null;
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
 * `pay_method` is required with `pay_on_delivery` and only then; `change_for_cents` only for cash.
 * Cents are integers 0–100000000; at most 200 lines.
 */
export interface OrderInput {
  type: OrderType;
  customer_name: string;
  address_text?: string | null;
  delivery_fee_cents?: number;
  pay_on_delivery?: boolean;
  pay_method?: PaymentMethod | null;
  change_for_cents?: number | null;
  note?: string | null;
  lines: LineInput[];
}

/** Body of `PUT /api/orders/{id}`: the whole order. Lines left out are removed; `edit_note` goes to the audit log. */
export interface OrderEditInput extends OrderInput {
  edit_note?: string | null;
}

export type TicketKind = 'kitchen' | 'bill';

/**
 * Footer shared by both tickets. `change_cents` = "troco para" − total; null without "troco para"
 * or when it does not cover the total.
 */
export interface TicketTotals {
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  pay_on_delivery: boolean;
  pay_method: PaymentMethod | null;
  change_for_cents: number | null;
  change_cents: number | null;
}

/**
 * `KitchenTicketResource`: body of `GET /api/orders/{id}/ticket?kind=kitchen`: same content as the bill plus the UPDATED/CANCEL flags.
 * `updated_version` is set when the kitchen already has an older print ("UPDATED vN").
 */
export interface KitchenTicket extends TicketTotals {
  kind: 'kitchen';
  number: number;
  type: OrderType;
  customer_name: string;
  address_text: string | null;
  created_at: string;
  version: number;
  updated_version: number | null;
  cancelled: boolean;
  cancel_reason: string | null;
  note: string | null;
  /** Same lines as the bill, for now. */
  lines: OrderLine[];
}

/** `BillResource`: body of `GET /api/orders/{id}/ticket?kind=bill` (non-fiscal). */
export interface Bill extends TicketTotals {
  kind: 'bill';
  number: number;
  type: OrderType;
  customer_name: string;
  address_text: string | null;
  created_at: string;
  version: number;
  cancelled: boolean;
  note: string | null;
  lines: OrderLine[];
  /** Non-voided payments. */
  payments: BillPayment[];
  paid_cents: number;
  /** Negative when overpaid. */
  balance_cents: number;
}

export interface BillPayment {
  method: PaymentMethod;
  amount_cents: number;
  tendered_cents: number | null;
  change_cents: number | null;
  payer_label: string | null;
}

export type Ticket = KitchenTicket | Bill;

/** Private channel and event the API broadcasts after each order change; refetch the order on it. */
export const ORDERS_CHANNEL = 'orders';
/** Leading dot: Echo takes the name as is, without the event namespace. */
export const ORDER_UPDATED_EVENT = '.order.updated';

/** Payload of `order.updated`. */
export interface OrderUpdated {
  id: number;
  version: number;
}
