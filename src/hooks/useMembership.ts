import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { MemberRole } from '../types/membership';

export const useMembership = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteMember = async (email: string, role: MemberRole): Promise<{ token: string } | null> => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ email: string; role: MemberRole }, { token: string }>(functions, 'inviteMember');
      const result = await fn({ email, role });
      return result.data;
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async (token: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ token: string }, { status: string }>(functions, 'acceptInvite');
      await fn({ token });
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to accept invite');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (targetUid: string, newRole: MemberRole): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ targetUid: string; newRole: MemberRole }, { status: string }>(functions, 'updateMemberRole');
      await fn({ targetUid, newRole });
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (targetUid: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ targetUid: string }, { status: string }>(functions, 'removeMember');
      await fn({ targetUid });
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { inviteMember, acceptInvite, updateMemberRole, removeMember, loading, error };
};