import { DocumentSnapshot, QueryDocumentSnapshot, Timestamp, FieldValue } from 'firebase/firestore';

// ─── Generic Service Result ───────────────────────────────────────────────────
// Every service method returns ServiceResult<T> so callers never need try/catch.

export type ServiceResult<T> =
  | { ok: true;  data: T;      error?: never }
  | { ok: false; data?: never; error: ServiceError };

export interface ServiceError {
  code: FirestoreErrorCode;
  message: string;
  path: string | null;
  operation: FirestoreOperation;
  raw?: unknown;
}

// ─── Firestore Operation Enum ─────────────────────────────────────────────────

export type FirestoreOperation =
  | 'get' | 'list' | 'create' | 'update' | 'delete'
  | 'subscribe' | 'transaction' | 'batch' | 'count';

// ─── Firestore Error Codes ────────────────────────────────────────────────────

export type FirestoreErrorCode =
  | 'not-found'
  | 'permission-denied'
  | 'unauthenticated'
  | 'already-exists'
  | 'resource-exhausted'
  | 'cancelled'
  | 'data-loss'
  | 'deadline-exceeded'
  | 'internal'
  | 'invalid-argument'
  | 'out-of-range'
  | 'unimplemented'
  | 'unavailable'
  | 'unknown';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PageOptions {
  pageSize: number;
  startAfterDoc?: DocumentSnapshot | QueryDocumentSnapshot;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PageResult<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot | null;  // pass as startAfterDoc for next page
  hasMore: boolean;
  total?: number;
}

// ─── Base Document ────────────────────────────────────────────────────────────
// Every Firestore document shape extends this.

export interface FirestoreDoc {
  id: string;
  createdAt?: Timestamp | FieldValue | string;
  updatedAt?: Timestamp | FieldValue | string;
}

// ─── Query Filter ─────────────────────────────────────────────────────────────

export type WhereOperator =
  | '==' | '!=' | '<' | '<=' | '>' | '>='
  | 'array-contains' | 'array-contains-any'
  | 'in' | 'not-in';

export interface WhereClause {
  field: string;
  op: WhereOperator;
  value: unknown;
}

export interface QueryOptions {
  where?: WhereClause[];
  orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
  limit?: number;
  startAfterDoc?: DocumentSnapshot | QueryDocumentSnapshot;
}

// ─── Converter Helper ─────────────────────────────────────────────────────────

export type FromFirestore<T> = (
  snapshot: QueryDocumentSnapshot,
  options?: unknown
) => T;

export type ToFirestore<T> = (data: T) => Record<string, unknown>;