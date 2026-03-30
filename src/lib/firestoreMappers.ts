import { DocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  Invoice,
  Customer,
  Product,
  Order,
  Estimate,
  Payment,
  Reminder,
  ActivityItem, // Updated name
  UserProfile,
  Merchant
} from '../types/index';

const extractData = <T>(snap: DocumentSnapshot<DocumentData>): T => {
  if (!snap.exists()) {
    throw new Error('Document does not exist in Firestore'); 
  }
  
  const data = snap.data() || {};
  
  return {
    id: snap.id,
    ...data,
  } as unknown as T;
};

// Specific Entity Mappers
export const invoiceFromDoc = (snap: DocumentSnapshot<DocumentData>): Invoice => extractData<Invoice>(snap);
export const customerFromDoc = (snap: DocumentSnapshot<DocumentData>): Customer => extractData<Customer>(snap);
export const productFromDoc = (snap: DocumentSnapshot<DocumentData>): Product => extractData<Product>(snap);
export const orderFromDoc = (snap: DocumentSnapshot<DocumentData>): Order => extractData<Order>(snap);
export const estimateFromDoc = (snap: DocumentSnapshot<DocumentData>): Estimate => extractData<Estimate>(snap);
export const paymentFromDoc = (snap: DocumentSnapshot<DocumentData>): Payment => extractData<Payment>(snap);
export const reminderFromDoc = (snap: DocumentSnapshot<DocumentData>): Reminder => extractData<Reminder>(snap);
// Updated to activityItemFromDoc
export const activityItemFromDoc = (snap: DocumentSnapshot<DocumentData>): ActivityItem => extractData<ActivityItem>(snap);
export const userProfileFromDoc = (snap: DocumentSnapshot<DocumentData>): UserProfile => extractData<UserProfile>(snap);
export const merchantFromDoc = (snap: DocumentSnapshot<DocumentData>): Merchant => extractData<Merchant>(snap);