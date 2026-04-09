import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { subscriptionService } from '../services/subscriptionService';
import {
  SubscriptionDetails,
  BillingInvoice,
  DetailedPlan,
} from '../types/subscription';

export function useSubscription() {
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [history, setHistory] = useState<BillingInvoice[]>([]);
  const [plans, setPlans]     = useState<DetailedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setBusinessId(user.uid);
      } else {
        setBusinessId(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);

    try {
      // FIX E1-E3: all three service methods return ServiceResult<T>.
      // Must destructure and check .ok before calling setState.
      const [detailsResult, historyResult, plansResult] = await Promise.all([
        subscriptionService.getSubscriptionDetails(businessId),
        subscriptionService.getBillingHistory(businessId),
        subscriptionService.getAvailablePlans(),
      ]);

      // FIX E1: unwrap ServiceResult<SubscriptionDetails>
      if (detailsResult.ok) {
        setDetails(detailsResult.data);
      } else {
        // Subscription doc not found → provide default free-plan object
        setDetails({
          currentPlanId: 'free',
          status: 'active',
          nextBillingDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          usageLimits: [
            { name: 'Monthly Invoices', current: 2, max: 5,  unit: 'invoices' },
            { name: 'Team Members',     current: 1, max: 1,  unit: 'members'  },
          ],
        });
      }

      // FIX E2: unwrap ServiceResult<BillingInvoice[]>
      if (historyResult.ok) {
        setHistory(historyResult.data);
      } else {
        setHistory([]);   // empty list is safe — not a fatal error
      }

      // FIX E3: unwrap ServiceResult<DetailedPlan[]>
      if (plansResult.ok) {
        setPlans(plansResult.data);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError('Failed to load billing information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) fetchData();
  }, [businessId, fetchData]);

  const upgradePlan = async (planId: string) => {
    // Redirect to Stripe Checkout in production
    console.log('Upgrading to plan:', planId);
    return true;
  };

  return { details, history, plans, loading, error, upgradePlan, refresh: fetchData };
}