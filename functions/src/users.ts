import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

type MemberRole = 'owner' | 'staff' | 'accountant' | 'support';

// ─── INVITE MEMBER ────────────────────────────────────────────────
export const inviteMember = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in.');

  const db = admin.firestore();
  const callerUid = request.auth.uid;

  // Verify caller is owner
  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'owner') {
    throw new HttpsError('permission-denied', 'Only the merchant owner can invite members.');
  }

  const { email, role } = request.data as { email: string; role: MemberRole };
  if (!email || !role) throw new HttpsError('invalid-argument', 'Email and role are required.');
  if (!['staff', 'accountant', 'support'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role. Must be staff, accountant, or support.');
  }

  const merchantId = callerDoc.data()?.merchantId;
  const token = uuidv4();
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
  );

  await db.collection('invites').doc(token).set({
    email: email.toLowerCase().trim(),
    role,
    merchantId,
    invitedBy: callerUid,
    invitedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'pending',
    expiresAt,
  });

  return { token };
});

// ─── ACCEPT INVITE ────────────────────────────────────────────────
export const acceptInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in.');

  const db = admin.firestore();
  const { token } = request.data as { token: string };
  if (!token) throw new HttpsError('invalid-argument', 'Token is required.');

  const inviteRef = db.collection('invites').doc(token);
  const inviteDoc = await inviteRef.get();

  if (!inviteDoc.exists) throw new HttpsError('not-found', 'Invite not found or already used.');

  const invite = inviteDoc.data()!;

  // Check status and expiry
  if (invite.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'This invite has already been used or expired.');
  }
  if (invite.expiresAt.toDate() < new Date()) {
    await inviteRef.update({ status: 'expired' });
    throw new HttpsError('deadline-exceeded', 'This invite link has expired.');
  }

  const uid = request.auth.uid;
  const userRecord = await admin.auth().getUser(uid);
  const callerEmail = userRecord.email?.toLowerCase();

  // Email must match
  if (callerEmail !== invite.email) {
    throw new HttpsError('permission-denied', `This invite was sent to ${invite.email}. Please sign in with that email.`);
  }

  const { merchantId, role, invitedBy } = invite;
  const batch = db.batch();

  // Create user profile in /users/{uid}
  const userRef = db.collection('users').doc(uid);
  batch.set(userRef, {
    id: uid,
    merchantId,
    role,
    status: 'active',
    displayName: userRecord.displayName || '',
    email: callerEmail,
    invitedBy,
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create membership doc in /merchants/{merchantId}/users/{uid}
  const memberRef = db.collection('merchants').doc(merchantId).collection('users').doc(uid);
  batch.set(memberRef, {
    uid,
    merchantId,
    role,
    status: 'active',
    displayName: userRecord.displayName || '',
    email: callerEmail,
    invitedBy,
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Mark invite as accepted
  batch.update(inviteRef, { status: 'accepted' });

  await batch.commit();

  // Set custom claims
  await admin.auth().setCustomUserClaims(uid, { merchantId, role });

  return { status: 'joined', merchantId };
});

// ─── UPDATE MEMBER ROLE ───────────────────────────────────────────
export const updateMemberRole = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in.');

  const db = admin.firestore();
  const callerUid = request.auth.uid;

  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'owner') {
    throw new HttpsError('permission-denied', 'Only the merchant owner can change roles.');
  }

  const { targetUid, newRole } = request.data as { targetUid: string; newRole: MemberRole };
  if (!targetUid || !newRole) throw new HttpsError('invalid-argument', 'targetUid and newRole required.');
  if (!['staff', 'accountant', 'support'].includes(newRole)) {
    throw new HttpsError('invalid-argument', 'Invalid role.');
  }
  if (targetUid === callerUid) throw new HttpsError('invalid-argument', 'Owner cannot change their own role.');

  const merchantId = callerDoc.data()?.merchantId;
  const batch = db.batch();

  batch.update(db.collection('users').doc(targetUid), { role: newRole });
  batch.update(db.collection('merchants').doc(merchantId).collection('users').doc(targetUid), { role: newRole });

  await batch.commit();
  await admin.auth().setCustomUserClaims(targetUid, { merchantId, role: newRole });

  return { status: 'updated' };
});

// ─── REMOVE MEMBER ────────────────────────────────────────────────
export const removeMember = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in.');

  const db = admin.firestore();
  const callerUid = request.auth.uid;

  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'owner') {
    throw new HttpsError('permission-denied', 'Only the merchant owner can remove members.');
  }

  const { targetUid } = request.data as { targetUid: string };
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid required.');
  if (targetUid === callerUid) throw new HttpsError('invalid-argument', 'Owner cannot remove themselves.');

  const merchantId = callerDoc.data()?.merchantId;
  const batch = db.batch();

  batch.update(db.collection('users').doc(targetUid), { status: 'suspended', merchantId: admin.firestore.FieldValue.delete() });
  batch.update(db.collection('merchants').doc(merchantId).collection('users').doc(targetUid), { status: 'suspended' });

  await batch.commit();
  await admin.auth().setCustomUserClaims(targetUid, {});

  return { status: 'removed' };
});