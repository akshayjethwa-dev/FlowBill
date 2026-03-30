import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

const COLLECTION_NAME = 'products';

export const productService = {
  getProductsPath: (merchantId: string) => `merchants/${merchantId}/${COLLECTION_NAME}`,

  subscribeToProducts: (
    merchantId: string, 
    callback: (products: Product[]) => void,
    onError: (error: any) => void
  ) => {
    const path = productService.getProductsPath(merchantId);
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      callback(products);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    });
  },

  addProduct: async (merchantId: string, productData: Omit<Product, 'id' | 'merchantId' | 'createdAt'>) => {
    const path = productService.getProductsPath(merchantId);
    const productRef = doc(collection(db, path));
    const newProduct: Product = {
      ...productData,
      id: productRef.id,
      merchantId,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(productRef, newProduct);
      return newProduct;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  updateProduct: async (merchantId: string, productId: string, productData: Partial<Product>) => {
    const path = productService.getProductsPath(merchantId);
    const productRef = doc(db, path, productId);

    try {
      await updateDoc(productRef, productData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  deleteProduct: async (merchantId: string, productId: string) => {
    const path = productService.getProductsPath(merchantId);
    const productRef = doc(db, path, productId);

    try {
      await deleteDoc(productRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }
};
