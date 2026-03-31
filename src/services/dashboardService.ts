import { collection, query, where, orderBy, limit, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Invoice } from '../types';

export const dashboardService = {
  getSnapshot: async (merchantId: string) => {
    // 1. Fetch denormalized summary metrics from Step 6
    const statsRef = doc(db, `merchants/${merchantId}/stats/dashboard`);
    
    // 2. Fetch latest 5 invoices (✅ Ignoring archived)
    const invoicesRef = collection(db, `merchants/${merchantId}/invoices`);
    const recentInvoicesQuery = query(
      invoicesRef,
      where('isArchived', '==', false),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const [statsSnap, recentSnap] = await Promise.all([
      getDoc(statsRef),
      getDocs(recentInvoicesQuery)
    ]);

    let stats = {
      totalInvoiced: 0,
      totalCollected: 0,
      totalOutstanding: 0,
    };

    if (statsSnap.exists()) {
      stats = { ...stats, ...statsSnap.data() };
    }

    const recentInvoices = recentSnap.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    })) as Invoice[];

    return {
      stats,
      recentInvoices
    };
  }
};