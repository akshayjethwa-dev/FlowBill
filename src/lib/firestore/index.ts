// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE SERVICE LAYER — PUBLIC API
//
// Import everything from this single entry point:
//   import { fsGet, fsList, paths, SORT, buildConstraints, ... }
//     from '../lib/firestore';
// ─────────────────────────────────────────────────────────────────────────────

// Path constants & builders
export * from './collections';

// Typed converters
export * from './converters';

// Query constraint builders
export * from './queryHelpers';

// Generic CRUD helpers
export * from './crudHelpers';

// Transaction & batch helpers
export * from './transactionHelpers';

// Error helpers
export * from './errorHelpers';