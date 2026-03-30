import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const setupUserAccount = onCall(async (request) => {
  // Ensure admin is initialized
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  // 1. Verify Authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  
  // 2. Check if user already exists
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    return { status: 'exists', message: 'User profile already setup.' };
  }

  // 3. First time login setup
  const merchantId = uid; // For MVP, the owner's UID is their merchant ID
  const batch = db.batch();

  // Create Merchant Profile
  const merchantRef = db.collection('merchants').doc(merchantId);
  batch.set(merchantRef, {
    businessName: '',
    ownerUid: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create User Profile
  const userRecord = await admin.auth().getUser(uid);
  batch.set(userRef, {
    id: uid,
    merchantId: merchantId,
    role: 'owner',
    displayName: userRecord.displayName || '',
    phone: userRecord.phoneNumber || '',
    email: userRecord.email || '',
    onboardingCompleted: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // 4. Set Custom Claims
  await admin.auth().setCustomUserClaims(uid, {
    merchantId: merchantId,
    role: 'owner'
  });

  return { status: 'created', message: 'User and merchant profile created.' };
});