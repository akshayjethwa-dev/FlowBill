import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { MembershipDoc } from '../types/membership';

interface MerchantContextType {
  teamMembers: MembershipDoc[];
  teamLoading: boolean;
  isOwner: boolean;
  canAccess: (section: string) => boolean;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

export const MerchantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, merchantProfile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<MembershipDoc[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  const isOwner = userProfile?.role === 'owner';

  const canAccess = (section: string): boolean => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner') return true;
    const allowed: Record<string, string[]> = {
      staff: ['customers', 'products', 'orders', 'invoices', 'estimates', 'payments', 'dashboard', 'create-order', 'create-invoice'],
      accountant: ['invoices', 'payments', 'ledger', 'reminders', 'reminder-history', 'customers', 'dashboard'],
      support: ['customers', 'orders', 'dashboard'],
    };
    return (allowed[userProfile.role] || []).includes(section);
  };

  useEffect(() => {
    if (!merchantProfile?.id || !isOwner) {
      setTeamLoading(false);
      return;
    }

    const membersRef = collection(db, 'merchants', merchantProfile.id, 'users');
    const q = query(membersRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snap) => {
      const members = snap.docs.map(d => ({ ...d.data() } as MembershipDoc));
      setTeamMembers(members);
      setTeamLoading(false);
    });

    return () => unsub();
  }, [merchantProfile?.id, isOwner]);

  return (
    <MerchantContext.Provider value={{ teamMembers, teamLoading, isOwner, canAccess }}>
      {children}
    </MerchantContext.Provider>
  );
};

export const useMerchant = () => {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error('useMerchant must be used within MerchantProvider');
  return ctx;
};