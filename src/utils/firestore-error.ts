// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE ERROR UTILITY  (existing file — extended, fully backward-compatible)
// ─────────────────────────────────────────────────────────────────────────────

import { FirebaseError } from 'firebase/app';
import { auth } from '../firebase';

// ── OperationType enum (unchanged — existing services use this) ───────────────

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST   = 'list',
  GET    = 'get',
  WRITE  = 'write',
}

// ── FirestoreErrorInfo (unchanged shape + new optional fields) ────────────────

export interface FirestoreErrorInfo {
  error:         string;
  operationType: OperationType;
  path:          string | null;
  // NEW — typed error code extracted from FirebaseError
  code?:         string;
  // NEW — whether this is a retriable error
  retriable?:    boolean;
  authInfo: {
    userId:        string | undefined;
    email:         string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous:   boolean | undefined;
    tenantId:      string | null | undefined;
    providerInfo: {
      providerId:  string;
      displayName: string | null;
      email:       string | null;
      photoUrl:    string | null;
    }[];
  };
}

// ── Codes that are safe to retry after a short delay ─────────────────────────

const RETRIABLE_CODES = new Set([
  'firestore/unavailable',
  'firestore/deadline-exceeded',
  'firestore/resource-exhausted',
  'firestore/internal',
]);

// ── handleFirestoreError (signature unchanged — all callers still work) ───────

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const code = error instanceof FirebaseError ? error.code : undefined;

  const errInfo: FirestoreErrorInfo = {
    error:         error instanceof Error ? error.message : String(error),
    code,
    retriable:     code ? RETRIABLE_CODES.has(code) : false,
    authInfo: {
      userId:        auth.currentUser?.uid,
      email:         auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous:   auth.currentUser?.isAnonymous,
      tenantId:      auth.currentUser?.tenantId,
      providerInfo:  auth.currentUser?.providerData.map((p) => ({
        providerId:  p.providerId,
        displayName: p.displayName,
        email:       p.email,
        photoUrl:    p.photoURL,
      })) ?? [],
    },
    operationType,
    path,
  };

  console.error('[FlowBill] Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ── NEW helper: safe version that returns instead of throwing ─────────────────
// Existing services use handleFirestoreError (throws). New code uses this.

export function captureFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const code = error instanceof FirebaseError ? error.code : undefined;
  return {
    error:    error instanceof Error ? error.message : String(error),
    code,
    retriable: code ? RETRIABLE_CODES.has(code) : false,
    authInfo: {
      userId:        auth.currentUser?.uid,
      email:         auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous:   auth.currentUser?.isAnonymous,
      tenantId:      auth.currentUser?.tenantId,
      providerInfo:  auth.currentUser?.providerData.map((p) => ({
        providerId:  p.providerId,
        displayName: p.displayName,
        email:       p.email,
        photoUrl:    p.photoURL,
      })) ?? [],
    },
    operationType,
    path,
  };
}