// src/hooks/useReminderJobs.ts
import { useState, useEffect } from 'react';
import { collection, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ReminderJob, ReminderJobStatus } from '../types';

/** All jobs for the merchant — for the Reminder Center overview */
export const useReminderJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs]       = useState<ReminderJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `merchants/${user.uid}/reminderJobs`),
      orderBy('scheduledAt', 'desc'),
    );
    return onSnapshot(q,
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReminderJob));
        setLoading(false);
      },
      () => { setError('Failed to load reminder jobs.'); setLoading(false); }
    );
  }, [user]);

  return { jobs, loading, error };
};

/** Jobs for a single invoice — for InvoiceDetail stage timeline */
export const useReminderJobsForInvoice = (invoiceId: string | null) => {
  const { user } = useAuth();
  const [jobs, setJobs]       = useState<ReminderJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user || !invoiceId) { setLoading(false); return; }
    const q = query(
      collection(db, `merchants/${user.uid}/reminderJobs`),
      where('invoiceId', '==', invoiceId),
      orderBy('scheduledAt', 'asc'),
    );
    return onSnapshot(q,
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReminderJob));
        setLoading(false);
      },
      () => { setError('Failed to load jobs.'); setLoading(false); }
    );
  }, [user, invoiceId]);

  return { jobs, loading, error };
};

/** Maps a job status to display label + Tailwind classes */
export function reminderJobStatusMeta(status: ReminderJobStatus) {
  switch (status) {
    case 'pending':    return { label: 'Pending',   color: 'text-amber-700', bg: 'bg-amber-100'  };
    case 'processing': return { label: 'Sending…',  color: 'text-blue-700',  bg: 'bg-blue-100'   };
    case 'completed':  return { label: 'Sent',      color: 'text-green-700', bg: 'bg-green-100'  };
    case 'skipped':    return { label: 'Skipped',   color: 'text-gray-600',  bg: 'bg-gray-100'   };
    case 'failed':     return { label: 'Failed',    color: 'text-red-700',   bg: 'bg-red-100'    };
    default:           return { label: status,      color: 'text-gray-600',  bg: 'bg-gray-100'   };
  }
}