// src/lib/whatsappApi.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, onSnapshot, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';

const functions = getFunctions(undefined, 'asia-south1');
const db        = getFirestore();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WhatsappConfig {
  provider:          string;
  status:            'pending' | 'active' | 'error' | 'disabled';
  businessNumber:    string;
  appName:           string;
  optInRequired:     boolean;
  lastError?:        string | null;
  updatedAt?:        unknown;
}

export interface WhatsappTemplate {
  templateKey:        string;
  providerTemplateId: string;
  category:           string;
  language:           string;
  sampleBody?:        string;
  paramOrder:         string[];
  approved:           boolean;
  updatedAt?:         unknown;
}

export interface SetupConfigInput {
  businessNumber: string;
  appName:        string;
}

export interface UpsertTemplateInput {
  templateKey:        string;
  providerTemplateId: string;
  category?:          string;
  language?:          string;
  sampleBody?:        string;
  paramOrder:         string[];
}

// ── Callable wrappers ─────────────────────────────────────────────────────────

export async function setupWhatsappConfig(input: SetupConfigInput): Promise<void> {
  const fn = httpsCallable<SetupConfigInput, { success: boolean }>(
    functions,
    'setupMerchantWhatsappConfig'
  );
  await fn(input);
}

export async function upsertTemplate(input: UpsertTemplateInput): Promise<void> {
  const fn = httpsCallable<UpsertTemplateInput, { success: boolean }>(
    functions,
    'upsertWhatsappTemplate'
  );
  await fn(input);
}

export async function deleteTemplate(templateKey: string): Promise<void> {
  const fn = httpsCallable<{ templateKey: string }, { success: boolean }>(
    functions,
    'deleteWhatsappTemplate'
  );
  await fn({ templateKey });
}

// ── Firestore live listeners ──────────────────────────────────────────────────

export function subscribeToWhatsappConfig(
  onData: (config: WhatsappConfig | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const uid = getAuth().currentUser?.uid;
  if (!uid) { onData(null); return () => {}; }

  const ref = doc(db, `merchants/${uid}/whatsappConfig/default`);
  return onSnapshot(
    ref,
    (snap) => onData(snap.exists() ? (snap.data() as WhatsappConfig) : null),
    (err) => onError?.(err)
  );
}

export function subscribeToWhatsappTemplates(
  onData: (templates: WhatsappTemplate[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const uid = getAuth().currentUser?.uid;
  if (!uid) { onData([]); return () => {}; }

  const ref = collection(db, `merchants/${uid}/whatsappTemplates`);
  return onSnapshot(
    ref,
    (snap) => onData(snap.docs.map((d) => d.data() as WhatsappTemplate)),
    (err) => onError?.(err)
  );
}