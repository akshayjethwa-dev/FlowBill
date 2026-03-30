import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Merchant } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';

export const merchantService = {
  async getMerchant(uid: string): Promise<Merchant | null> {
    const path = `merchants/${uid}`;
    try {
      const docSnap = await getDoc(doc(db, path));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Merchant;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveMerchantOnboarding(uid: string, data: Partial<Merchant>): Promise<void> {
    const path = `merchants/${uid}`;
    try {
      await setDoc(doc(db, path), {
        ...data,
        onboarded: true,
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
