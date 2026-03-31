import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Merchant, MerchantOnboardingState } from '../types/user';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

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

  // Merges detailed onboarding states securely
  async updateOnboardingState(uid: string, onboardingUpdates: Partial<MerchantOnboardingState>): Promise<void> {
    const path = `merchants/${uid}`;
    try {
      // Using dot notation to only update specific nested fields without overwriting the whole object
      const updates: Record<string, any> = { updatedAt: serverTimestamp() };
      Object.entries(onboardingUpdates).forEach(([key, value]) => {
        updates[`onboarding.${key}`] = value;
      });

      await setDoc(doc(db, path), updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  }
};