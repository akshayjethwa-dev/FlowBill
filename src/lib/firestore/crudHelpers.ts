// ─────────────────────────────────────────────────────────────────────────────
// GENERIC CRUD HELPERS
//
// These typed functions handle the repetitive Firestore SDK boilerplate that
// every service currently duplicates. Service files call these instead.
//
// All functions return ServiceResult<T> — they never throw.
// Real-time subscriptions return an Unsubscribe fn (same as onSnapshot).
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, serverTimestamp, getCountFromServer,
  FirestoreDataConverter, DocumentSnapshot,
  QueryDocumentSnapshot, Unsubscribe, CollectionReference,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { buildConstraints } from './queryHelpers';
import { makeConverter } from './converters';
import { buildServiceError } from './errorHelpers';
import {
  ServiceResult, QueryOptions, PageResult, FirestoreDoc, FirestoreOperation,
} from '../../types/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// GET — fetch a single document by ID
// ─────────────────────────────────────────────────────────────────────────────

export async function fsGet<T extends FirestoreDoc>(
  collectionPath: string,
  id: string,
  converter?: FirestoreDataConverter<T>
): Promise<ServiceResult<T>> {
  const op: FirestoreOperation = 'get';
  try {
    const ref = converter
      ? doc(db, collectionPath, id).withConverter(converter)
      : doc(db, collectionPath, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { ok: false, error: buildServiceError('not-found', op, collectionPath, `Document ${id} not found`) };
    }
    return { ok: true, data: { id: snap.id, ...snap.data() } as T };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, op, collectionPath, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST — fetch a collection with optional filters
// ─────────────────────────────────────────────────────────────────────────────

export async function fsList<T extends FirestoreDoc>(
  collectionPath: string,
  opts: QueryOptions = {},
  converter?: FirestoreDataConverter<T>
): Promise<ServiceResult<T[]>> {
  const op: FirestoreOperation = 'list';
  try {
    let ref: CollectionReference = collection(db, collectionPath);
    if (converter) ref = ref.withConverter(converter) as CollectionReference;
    const q = query(ref, ...buildConstraints(opts));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
    return { ok: true, data: items };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, op, collectionPath, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST PAGINATED — cursor-based pagination
// ─────────────────────────────────────────────────────────────────────────────

export async function fsListPage<T extends FirestoreDoc>(
  collectionPath: string,
  opts: QueryOptions & { pageSize: number },
  converter?: FirestoreDataConverter<T>
): Promise<ServiceResult<PageResult<T>>> {
  const op: FirestoreOperation = 'list';
  try {
    // Fetch pageSize + 1 to detect hasMore
    const fetchOpts: QueryOptions = { ...opts, limit: opts.pageSize + 1 };
    let ref: CollectionReference = collection(db, collectionPath);
    if (converter) ref = ref.withConverter(converter) as CollectionReference;
    const q = query(ref, ...buildConstraints(fetchOpts));
    const snap = await getDocs(q);
    const allDocs = snap.docs;
    const hasMore = allDocs.length > opts.pageSize;
    const pageDocs = hasMore ? allDocs.slice(0, opts.pageSize) : allDocs;
    const items = pageDocs.map((d) => ({ id: d.id, ...d.data() } as T));
    const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;
    return { ok: true, data: { items, lastDoc, hasMore } };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, op, collectionPath, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNT — aggregate count without fetching documents
// ─────────────────────────────────────────────────────────────────────────────

export async function fsCount(
  collectionPath: string,
  opts: QueryOptions = {}
): Promise<ServiceResult<number>> {
  const op: FirestoreOperation = 'count';
  try {
    const ref = collection(db, collectionPath);
    const q = query(ref, ...buildConstraints(opts));
    const snap = await getCountFromServer(q);
    return { ok: true, data: snap.data().count };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, op, collectionPath, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE — add with auto-generated ID
// ─────────────────────────────────────────────────────────────────────────────

export async function fsCreate<T extends FirestoreDoc>(
  collectionPath: string,
  data: Omit<T, 'id'>,
  converter?: FirestoreDataConverter<T>
): Promise<ServiceResult<string>> {
  const op: FirestoreOperation = 'create';
  try {
    let ref: CollectionReference = collection(db, collectionPath);
    if (converter) ref = ref.withConverter(converter) as CollectionReference;
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { ok: true, data: docRef.id };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, op, collectionPath, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SET — write with known ID (merge: true means it won't wipe other fields)
// ─────────────────────────────────────────────────────────────────────────────

export async function fsSet<T extends FirestoreDoc>(
  collectionPath: string,
  id: string,
  data: Partial<T>,
  merge = true
): Promise<ServiceResult<void>> {
  const op: FirestoreOperation = 'create';
  try {
    const ref = doc(db, collectionPath, id);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, op, collectionPath, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE — partial field update
// ─────────────────────────────────────────────────────────────────────────────

export async function fsUpdate<T extends FirestoreDoc>(
  collectionPath: string,
  id: string,
  data: Partial<T>
): Promise<ServiceResult<void>> {
  const op: FirestoreOperation = 'update';
  try {
    const ref = doc(db, collectionPath, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, op, collectionPath, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — remove a document
// ─────────────────────────────────────────────────────────────────────────────

export async function fsDelete(
  collectionPath: string,
  id: string
): Promise<ServiceResult<void>> {
  const op: FirestoreOperation = 'delete';
  try {
    await deleteDoc(doc(db, collectionPath, id));
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: buildServiceError(null, op, collectionPath, e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIBE — real-time listener on a collection
// ─────────────────────────────────────────────────────────────────────────────

export function fsSubscribe<T extends FirestoreDoc>(
  collectionPath: string,
  opts: QueryOptions = {},
  onData: (items: T[]) => void,
  onError: (err: ServiceResult<never>) => void,
  converter?: FirestoreDataConverter<T>
): Unsubscribe {
  let ref: CollectionReference = collection(db, collectionPath);
  if (converter) ref = ref.withConverter(converter) as CollectionReference;
  const q = query(ref, ...buildConstraints(opts));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      onData(items);
    },
    (e) => {
      onError({ ok: false, error: buildServiceError(null, 'subscribe', collectionPath, e) });
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIBE SINGLE DOC — real-time listener on one document
// ─────────────────────────────────────────────────────────────────────────────

export function fsSubscribeDoc<T extends FirestoreDoc>(
  collectionPath: string,
  id: string,
  onData: (item: T | null) => void,
  onError: (err: ServiceResult<never>) => void,
  converter?: FirestoreDataConverter<T>
): Unsubscribe {
  const ref = converter
    ? doc(db, collectionPath, id).withConverter(converter)
    : doc(db, collectionPath, id);

  return onSnapshot(
    ref,
    (snap: DocumentSnapshot) => {
      onData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null);
    },
    (e) => {
      onError({ ok: false, error: buildServiceError(null, 'subscribe', collectionPath, e) });
    }
  );
}