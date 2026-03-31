// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION CONSTANTS & PATH BUILDERS
//
// Single source of truth for every Firestore path in FlowBill.
// Never write a raw string path anywhere else in the codebase.
// Always use these constants + builders.
// ─────────────────────────────────────────────────────────────────────────────

// ── Root ─────────────────────────────────────────────────────────────────────

export const ROOT = {
  MERCHANTS: 'merchants',
} as const;

// ── Sub-collection names (relative) ──────────────────────────────────────────

export const SUB = {
  INVOICES:        'invoices',
  ESTIMATES:       'estimates',
  ORDERS:          'orders',
  CUSTOMERS:       'customers',
  PRODUCTS:        'products',
  PAYMENTS:        'payments',
  REMINDERS:       'reminders',
  ACTIVITY:        'activity',
  ACTIVITY_LOGS:   'activityLogs',
  TEAM:            'team',
  BILLING_HISTORY: 'billingHistory',
  LEDGER:          'ledger',

  // Singleton documents (no sub-docs, one doc per merchant)
  SETTINGS:        'settings/main',
  SUBSCRIPTION:    'subscription/current',
  COUNTERS:        'meta/counters',
} as const;

// ── Path builders ─────────────────────────────────────────────────────────────

/** Root merchant document: `merchants/{merchantId}` */
export const merchantDoc = (merchantId: string) =>
  `${ROOT.MERCHANTS}/${merchantId}`;

/** Generic sub-collection: `merchants/{merchantId}/{sub}` */
export const col = (merchantId: string, sub: string) =>
  `${merchantDoc(merchantId)}/${sub}`;

/** Generic sub-collection document: `merchants/{merchantId}/{sub}/{docId}` */
export const docPath = (merchantId: string, sub: string, docId: string) =>
  `${col(merchantId, sub)}/${docId}`;

// ── Named path builders (preferred — use these, not raw strings) ──────────────

export const paths = {
  merchant:        (mid: string)                   => merchantDoc(mid),
  invoices:        (mid: string)                   => col(mid, SUB.INVOICES),
  invoice:         (mid: string, id: string)       => docPath(mid, SUB.INVOICES, id),
  estimates:       (mid: string)                   => col(mid, SUB.ESTIMATES),
  estimate:        (mid: string, id: string)       => docPath(mid, SUB.ESTIMATES, id),
  orders:          (mid: string)                   => col(mid, SUB.ORDERS),
  order:           (mid: string, id: string)       => docPath(mid, SUB.ORDERS, id),
  customers:       (mid: string)                   => col(mid, SUB.CUSTOMERS),
  customer:        (mid: string, id: string)       => docPath(mid, SUB.CUSTOMERS, id),
  products:        (mid: string)                   => col(mid, SUB.PRODUCTS),
  product:         (mid: string, id: string)       => docPath(mid, SUB.PRODUCTS, id),
  payments:        (mid: string)                   => col(mid, SUB.PAYMENTS),
  payment:         (mid: string, id: string)       => docPath(mid, SUB.PAYMENTS, id),
  reminders:       (mid: string)                   => col(mid, SUB.REMINDERS),
  reminder:        (mid: string, id: string)       => docPath(mid, SUB.REMINDERS, id),
  activity:        (mid: string)                   => col(mid, SUB.ACTIVITY),
  activityLogs:    (mid: string)                   => col(mid, SUB.ACTIVITY_LOGS),
  team:            (mid: string)                   => col(mid, SUB.TEAM),
  teamMember:      (mid: string, id: string)       => docPath(mid, SUB.TEAM, id),
  billingHistory:  (mid: string)                   => col(mid, SUB.BILLING_HISTORY),
  ledger:          (mid: string)                   => col(mid, SUB.LEDGER),
  settings:        (mid: string)                   => `${merchantDoc(mid)}/${SUB.SETTINGS}`,
  subscription:    (mid: string)                   => `${merchantDoc(mid)}/${SUB.SUBSCRIPTION}`,
  counters:        (mid: string)                   => `${merchantDoc(mid)}/${SUB.COUNTERS}`,
} as const;

// ── Convenience aliases for the most-used paths ───────────────────────────────

export const PATHS = paths;  // shorter alias