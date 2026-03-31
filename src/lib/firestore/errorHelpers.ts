// ─────────────────────────────────────────────────────────────────────────────
// ERROR HELPERS
//
// Converts raw Firebase SDK errors into typed ServiceError objects.
// Also provides a backward-compatible bridge so existing service files that
// call handleFirestoreError() still work unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { FirebaseError } from 'firebase/app';
import { auth } from '../../firebase';
import { ServiceError, FirestoreErrorCode, FirestoreOperation } from '../../types/firestore';

// ── Firebase code → our typed code ───────────────────────────────────────────

const CODE_MAP: Record<string, FirestoreErrorCode> = {
  'permission-denied':   'permission-denied',
  'unauthenticated':     'unauthenticated',
  'not-found':           'not-found',
  'already-exists':      'already-exists',
  'resource-exhausted':  'resource-exhausted',
  'cancelled':           'cancelled',
  'data-loss':           'data-loss',
  'deadline-exceeded':   'deadline-exceeded',
  'internal':            'internal',
  'invalid-argument':    'invalid-argument',
  'out-of-range':        'out-of-range',
  'unimplemented':       'unimplemented',
  'unavailable':         'unavailable',
};

export function mapFirebaseCode(code: string): FirestoreErrorCode {
  return CODE_MAP[code] ?? 'unknown';
}

// ── Build a ServiceError ──────────────────────────────────────────────────────

export function buildServiceError(
  code: FirestoreErrorCode | null,
  operation: FirestoreOperation,
  path: string | null,
  raw?: unknown
): ServiceError {
  let resolvedCode: FirestoreErrorCode = code ?? 'unknown';
  let message = 'An unexpected error occurred';

  if (raw instanceof FirebaseError) {
    resolvedCode = mapFirebaseCode(raw.code.replace('firestore/', ''));
    message = raw.message;
  } else if (raw instanceof Error) {
    message = raw.message;
  } else if (typeof raw === 'string') {
    message = raw;
  }

  const error: ServiceError = { code: resolvedCode, message, path, operation, raw };

  // Log enriched error (preserves existing behaviour)
  console.error('[FlowBill Firestore]', JSON.stringify({
    ...error,
    raw: undefined,
    auth: {
      uid:      auth.currentUser?.uid,
      email:    auth.currentUser?.email,
      verified: auth.currentUser?.emailVerified,
    },
  }));

  return error;
}

// ── User-facing message from a ServiceError ───────────────────────────────────

export function userMessage(err: ServiceError): string {
  switch (err.code) {
    case 'permission-denied':  return 'You do not have permission to perform this action.';
    case 'unauthenticated':    return 'Your session has expired. Please sign in again.';
    case 'not-found':          return 'The requested record was not found.';
    case 'already-exists':     return 'A record with this ID already exists.';
    case 'resource-exhausted': return 'You have reached your plan limit. Please upgrade.';
    case 'unavailable':        return 'Service temporarily unavailable. Please try again shortly.';
    case 'deadline-exceeded':  return 'The request timed out. Please check your connection.';
    default:                   return 'Something went wrong. Please try again.';
  }
}

// ── Backward-compatibility shim ───────────────────────────────────────────────
// Existing service files import { handleFirestoreError, OperationType } from
// '../utils/firestore-error'. This shim re-exports from there so nothing breaks.
// The new code should use buildServiceError() directly.

export { handleFirestoreError, OperationType } from '../../utils/firestore-error';