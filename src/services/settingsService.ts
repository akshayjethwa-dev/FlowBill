import { doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';
import { MerchantSettings, BusinessProfile, BrandingSettings, GSTSettings,
  InvoiceSettings, ReminderSettings, PaymentSettings, TeamMember } from '../types/settings';

const settingsPath = (merchantId: string) => `merchants/${merchantId}/settings/main`;
const teamPath    = (merchantId: string) => `merchants/${merchantId}/team`;

export const settingsService = {
  async getSettings(merchantId: string): Promise<MerchantSettings | null> {
    const path = settingsPath(merchantId);
    try {
      const snap = await getDoc(doc(db, path));
      return snap.exists() ? ({ merchantId, ...snap.data() } as MerchantSettings) : null;
    } catch (e) { handleFirestoreError(e, OperationType.GET, path); return null; }
  },

  async saveSettings(merchantId: string, data: Partial<MerchantSettings>): Promise<void> {
    const path = settingsPath(merchantId);
    try {
      await setDoc(doc(db, path), { ...data, merchantId, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, path); throw e; }
  },

  async updateBusinessProfile(merchantId: string, data: Partial<BusinessProfile>): Promise<void> {
    const path = settingsPath(merchantId);
    try {
      await setDoc(doc(db, path), { businessProfile: data, updatedAt: serverTimestamp() }, { merge: true });
      // Sync key fields to merchant root
      await updateDoc(doc(db, `merchants/${merchantId}`), {
        businessName: data.businessName,
        ownerName: data.ownerName,
        email: data.email,
        phone: data.phone,
        address: data.address,
      });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, path); throw e; }
  },

  async updateBranding(merchantId: string, data: Partial<BrandingSettings>): Promise<void> {
    const path = settingsPath(merchantId);
    try {
      await setDoc(doc(db, path), { branding: data, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, path); throw e; }
  },

  async updateGST(merchantId: string, data: Partial<GSTSettings>): Promise<void> {
    const path = settingsPath(merchantId);
    try {
      await setDoc(doc(db, path), { gst: data, updatedAt: serverTimestamp() }, { merge: true });
      if (data.gstin !== undefined)
        await updateDoc(doc(db, `merchants/${merchantId}`), { gstin: data.gstin });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, path); throw e; }
  },

  async updateInvoiceSettings(merchantId: string, data: Partial<InvoiceSettings>): Promise<void> {
    const path = settingsPath(merchantId);
    try {
      await setDoc(doc(db, path), { invoice: data, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, path); throw e; }
  },

  async updateReminderSettings(merchantId: string, data: Partial<ReminderSettings>): Promise<void> {
    const path = settingsPath(merchantId);
    try {
      await setDoc(doc(db, path), { reminders: data, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, path); throw e; }
  },

  async updatePaymentSettings(merchantId: string, data: Partial<PaymentSettings>): Promise<void> {
    const path = settingsPath(merchantId);
    try {
      await setDoc(doc(db, path), { payment: data, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, path); throw e; }
  },

  async getTeamMembers(merchantId: string): Promise<TeamMember[]> {
    const path = teamPath(merchantId);
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamMember));
    } catch (e) { handleFirestoreError(e, OperationType.GET, path); return []; }
  },

  async addTeamMember(merchantId: string, member: Omit<TeamMember, 'id' | 'addedAt'>): Promise<string> {
    const path = teamPath(merchantId);
    try {
      const ref = await addDoc(collection(db, path), { ...member, active: true, addedAt: serverTimestamp() });
      return ref.id;
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, path); throw e; }
  },

  async removeTeamMember(merchantId: string, memberId: string): Promise<void> {
    const path = `${teamPath(merchantId)}/${memberId}`;
    try { await deleteDoc(doc(db, path)); }
    catch (e) { handleFirestoreError(e, OperationType.DELETE, path); throw e; }
  },
};