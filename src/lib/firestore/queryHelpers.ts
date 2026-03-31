// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE QUERY CONSTRAINT BUILDERS
//
// Build Firestore QueryConstraint arrays from plain option objects.
// All service methods that need filtering call these helpers instead of
// writing raw where()/orderBy()/limit() calls inline.
// ─────────────────────────────────────────────────────────────────────────────

import {
  QueryConstraint,
  where,
  orderBy,
  limit,
  limitToLast,
  startAfter,
  startAt,
  endBefore,
  endAt,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { QueryOptions, WhereClause } from '../../types/firestore';

// ── Build constraints from QueryOptions ──────────────────────────────────────

export function buildConstraints(opts: QueryOptions = {}): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  // WHERE clauses
  if (opts.where?.length) {
    for (const clause of opts.where) {
      constraints.push(where(clause.field, clause.op, clause.value));
    }
  }

  // ORDER BY (supports multiple fields)
  if (opts.orderBy?.length) {
    for (const o of opts.orderBy) {
      constraints.push(orderBy(o.field, o.direction ?? 'asc'));
    }
  }

  // Cursor pagination
  if (opts.startAfterDoc) {
    constraints.push(startAfter(opts.startAfterDoc));
  }

  // LIMIT
  if (opts.limit !== undefined && opts.limit > 0) {
    constraints.push(limit(opts.limit));
  }

  return constraints;
}

// ── Merchant-scoped where helpers ────────────────────────────────────────────
// These are the most common query patterns across the app.

/** Filter documents where `merchantId == id` */
export const byMerchant = (merchantId: string): WhereClause => ({
  field: 'merchantId',
  op: '==',
  value: merchantId,
});

/** Filter by a string status field */
export const byStatus = (status: string): WhereClause => ({
  field: 'status',
  op: '==',
  value: status,
});

/** Filter by a customer */
export const byCustomer = (customerId: string): WhereClause => ({
  field: 'customerId',
  op: '==',
  value: customerId,
});

/** Filter documents created on or after an ISO date string or Timestamp */
export const createdAfter = (date: Date | Timestamp): WhereClause => ({
  field: 'createdAt',
  op: '>=',
  value: date instanceof Date ? Timestamp.fromDate(date) : date,
});

/** Filter documents created on or before */
export const createdBefore = (date: Date | Timestamp): WhereClause => ({
  field: 'createdAt',
  op: '<=',
  value: date instanceof Date ? Timestamp.fromDate(date) : date,
});

/** Date range helper — returns [createdAfter, createdBefore] tuple */
export const dateRange = (from: Date, to: Date): [WhereClause, WhereClause] => [
  createdAfter(from),
  createdBefore(to),
];

/** Filter overdue invoices: dueDate < now AND status != paid */
export const overdue = (): WhereClause[] => [
  { field: 'dueDate', op: '<', value: Timestamp.fromDate(new Date()) },
  { field: 'status',  op: '!=', value: 'paid' },
];

/** Full-text prefix search approximation on a single field
 *  Uses Firestore's range trick: field >= term AND field <= term + '\uf8ff' */
export const prefixSearch = (field: string, term: string): WhereClause[] => [
  { field, op: '>=', value: term },
  { field, op: '<=', value: term + '\uf8ff' },
];

// ── Standard sort presets ─────────────────────────────────────────────────────

export const SORT = {
  CREATED_DESC:  { field: 'createdAt', direction: 'desc' } as const,
  CREATED_ASC:   { field: 'createdAt', direction: 'asc'  } as const,
  UPDATED_DESC:  { field: 'updatedAt', direction: 'desc' } as const,
  AMOUNT_DESC:   { field: 'totalAmount', direction: 'desc' } as const,
  DUE_DATE_ASC:  { field: 'dueDate', direction: 'asc'  } as const,
  NAME_ASC:      { field: 'name', direction: 'asc'  } as const,
} as const;

// ── Page-size presets ─────────────────────────────────────────────────────────

export const PAGE = {
  SMALL:  10,
  DEFAULT: 20,
  LARGE:  50,
  MAX:    100,
} as const;