// Palace FK / JSONB map for plain-Postgres PostgREST compat
export interface FkEdge {
  column: string;
  foreignTable: string;
  foreignColumn: string;
}

export const JSONB_COLUMNS: Record<string, Set<string>> = {
  addresses: new Set(['metadata']),
  audit_logs: new Set(['details']),
  banners: new Set(['metadata']),
  categories: new Set(['metadata']),
  cms_content: new Set(['metadata']),
  coupons: new Set(['metadata']),
  customers: new Set(['default_address', 'metadata']),
  notifications: new Set(['data']),
  order_items: new Set(['metadata']),
  orders: new Set(['billing_address', 'metadata', 'shipping_address']),
  product_variants: new Set(['metadata', 'options']),
  products: new Set(['metadata', 'options']),
  profiles: new Set(['preferences']),
  site_settings: new Set(['value']),
  store_settings: new Set(['value']),
  support_ticket_messages: new Set(['attachments']),
  support_tickets: new Set(['metadata']),
  chat_conversations: new Set(['metadata']),
  ai_memory: new Set(['metadata']),
  delivery_assignments: new Set(['metadata']),
  riders: new Set(['metadata']),
  delivery_zones: new Set(['metadata']),
};

export const FK_MAP: Record<string, FkEdge[]> = {
  cart_items: [
    { column: 'product_id', foreignTable: 'products', foreignColumn: 'id' },
    { column: 'variant_id', foreignTable: 'product_variants', foreignColumn: 'id' },
  ],
  categories: [
    { column: 'parent_id', foreignTable: 'categories', foreignColumn: 'id' },
  ],
  order_items: [
    { column: 'order_id', foreignTable: 'orders', foreignColumn: 'id' },
    { column: 'product_id', foreignTable: 'products', foreignColumn: 'id' },
    { column: 'variant_id', foreignTable: 'product_variants', foreignColumn: 'id' },
  ],
  payment_attempts: [
    { column: 'order_id', foreignTable: 'orders', foreignColumn: 'id' },
  ],
  payment_webhook_events: [
    { column: 'order_id', foreignTable: 'orders', foreignColumn: 'id' },
    { column: 'payment_attempt_id', foreignTable: 'payment_attempts', foreignColumn: 'id' },
  ],
  sms_messages: [
    { column: 'related_order_id', foreignTable: 'orders', foreignColumn: 'id' },
    { column: 'related_payment_attempt_id', foreignTable: 'payment_attempts', foreignColumn: 'id' },
  ],
  order_status_history: [
    { column: 'order_id', foreignTable: 'orders', foreignColumn: 'id' },
  ],
  product_images: [
    { column: 'product_id', foreignTable: 'products', foreignColumn: 'id' },
  ],
  product_variants: [
    { column: 'product_id', foreignTable: 'products', foreignColumn: 'id' },
  ],
  products: [
    { column: 'category_id', foreignTable: 'categories', foreignColumn: 'id' },
  ],
  return_requests: [
    { column: 'order_id', foreignTable: 'orders', foreignColumn: 'id' },
  ],
  review_images: [
    { column: 'review_id', foreignTable: 'reviews', foreignColumn: 'id' },
  ],
  reviews: [
    { column: 'product_id', foreignTable: 'products', foreignColumn: 'id' },
    { column: 'user_id', foreignTable: 'profiles', foreignColumn: 'id' },
  ],
  support_ticket_messages: [
    { column: 'ticket_id', foreignTable: 'support_tickets', foreignColumn: 'id' },
  ],
  support_tickets: [
    { column: 'user_id', foreignTable: 'profiles', foreignColumn: 'id' },
  ],
  wishlist_items: [
    { column: 'product_id', foreignTable: 'products', foreignColumn: 'id' },
  ],
  delivery_assignments: [
    { column: 'order_id', foreignTable: 'orders', foreignColumn: 'id' },
    { column: 'rider_id', foreignTable: 'riders', foreignColumn: 'id' },
  ],
  delivery_status_history: [
    { column: 'assignment_id', foreignTable: 'delivery_assignments', foreignColumn: 'id' },
  ],
  chat_conversations: [
    { column: 'user_id', foreignTable: 'profiles', foreignColumn: 'id' },
  ],
};
