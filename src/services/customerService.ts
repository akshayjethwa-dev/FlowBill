import {
  collection, addDoc, updateDoc, doc,
  query, orderBy, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Customer } from "../types";  // ✅ single source of truth

// Input type — only the fields a user fills in
export type CustomerData = Omit<
  Customer,
  "id" | "merchantId" | "createdAt" | "updatedAt"
>;

const customersPath = (merchantId: string) =>
  `merchants/${merchantId}/customers`;

export async function listCustomers(merchantId: string): Promise<Customer[]> {
  const ref = collection(db, customersPath(merchantId));
  const q = query(ref, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Customer, "id">) }));
}

export async function createCustomer(merchantId: string, data: CustomerData): Promise<string> {
  const ref = collection(db, customersPath(merchantId));
  const docRef = await addDoc(ref, {
    ...data,
    merchantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCustomer(
  merchantId: string,
  customerId: string,
  data: Partial<CustomerData>
): Promise<void> {
  const ref = doc(db, customersPath(merchantId), customerId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}