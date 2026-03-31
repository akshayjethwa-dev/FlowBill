import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole, UserStatus } from '../types/user';
import { handleFirestoreError, OperationType } from '../utils/firestore-error';

export const teamService = {
  // Fetch all members belonging to a merchant
  async getTeamMembers(merchantId: string): Promise<UserProfile[]> {
    const q = query(collection(db, 'users'), where('merchantId', '==', merchantId));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as UserProfile[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      throw error;
    }
  },

  // Note: Actual invitations usually require a Cloud Function to send the email 
  // and create a pending auth record. This is the Firestore portion.
  async inviteTeamMember(merchantId: string, inviterUid: string, email: string, role: UserRole) {
    const inviteId = doc(collection(db, `merchants/${merchantId}/invites`)).id;
    try {
      await setDoc(doc(db, `merchants/${merchantId}/invites`, inviteId), {
        email,
        role,
        status: 'pending',
        invitedBy: inviterUid,
        createdAt: serverTimestamp()
      });
      return inviteId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invites');
      throw error;
    }
  },

  // Update a team member's role (Owner/Admin only action)
  async updateUserRole(uid: string, newRole: UserRole) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      throw error;
    }
  },

  // Suspend or Activate a team member (Revokes app access immediately)
  async setUserStatus(uid: string, status: UserStatus) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      throw error;
    }
  }
};