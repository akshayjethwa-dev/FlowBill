import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Customer } from '../types/customer';

type UpsertCustomerInput = Partial<Customer> & {
  merchantId: string;
  name: string;
};

function normalizeWhatsappNumber(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, '').replace(/^\+/, '');
}

function buildCustomerPayload(input: UpsertCustomerInput) {
  return {
    merchantId: input.merchantId,
    name: input.name.trim(),
    phone: input.phone?.trim() ?? '',
    email: input.email?.trim() ?? '',
    address: input.address?.trim() ?? '',

    whatsappNumber: normalizeWhatsappNumber(
      input.whatsappNumber ?? input.phone ?? null
    ),
    whatsappOptIn: input.whatsappOptIn ?? false,
    whatsappOptedOutAt: input.whatsappOptedOutAt ?? null,

    updatedAt: serverTimestamp(),
  };
}

export async function createCustomer(input: UpsertCustomerInput) {
  const payload = {
    ...buildCustomerPayload(input),
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, 'merchants', input.merchantId, 'customers'),
    payload
  );

  return ref.id;
}

export async function updateCustomer(customerId: string, input: UpsertCustomerInput) {
  const ref = doc(db, 'merchants', input.merchantId, 'customers', customerId);
  await updateDoc(ref, buildCustomerPayload(input));
}

export async function setCustomerWhatsappConsent(params: {
  merchantId: string;
  customerId: string;
  whatsappOptIn: boolean;
  whatsappNumber?: string | null;
}) {
  const ref = doc(db, 'merchants', params.merchantId, 'customers', params.customerId);

  await updateDoc(ref, {
    whatsappOptIn: params.whatsappOptIn,
    whatsappNumber: normalizeWhatsappNumber(params.whatsappNumber ?? null),
    whatsappOptedOutAt: params.whatsappOptIn ? null : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}