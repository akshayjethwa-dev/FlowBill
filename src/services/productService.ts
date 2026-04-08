import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types/product';
import { ServiceResult } from '../types/firestore';
import { productConverter, withTimestamps } from '../lib/models/converters';
import { FSPath } from '../lib/models/paths';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const col = (merchantId: string) =>
  collection(db, FSPath.products(merchantId)).withConverter(productConverter);

export function subscribeToProducts(
  merchantId: string,
  callback: (products: Product[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    col(merchantId),
    where('merchantId', '==', merchantId),
    where('isArchived', '!=', true),
    orderBy('name', 'asc'),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => d.data())),
    error => {
      handleFirestoreError(error, OperationType.LIST, FSPath.products(merchantId));
      onError(error);
    },
  );
}

export async function addProduct(
  merchantId: string,
  productData: Omit<Product, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<Product>> {
  const path = FSPath.products(merchantId);
  try {
    const productRef = doc(col(merchantId));
    const newProduct = withTimestamps<Product>(
      { ...productData, id: productRef.id, merchantId, isArchived: false },
      true,
    ) as Product;
    await setDoc(productRef, newProduct);
    return { ok: true, data: newProduct };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'create', raw: e } };
  }
}

export async function updateProduct(
  merchantId: string,
  productId: string,
  data: Partial<Omit<Product, 'id' | 'merchantId' | 'createdAt'>>,
): Promise<ServiceResult<void>> {
  const path = FSPath.product(merchantId, productId);
  try {
    await updateDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'update', raw: e } };
  }
}

// Products are never hard-deleted — they may be referenced by past invoices.
export async function deleteProduct(
  merchantId: string,
  productId: string,
): Promise<ServiceResult<void>> {
  return updateProduct(merchantId, productId, { isArchived: true, isActive: false });
}

export const productService = {
  getProductsPath: FSPath.products,
  subscribeToProducts,
  addProduct,
  updateProduct,
  deleteProduct,
};