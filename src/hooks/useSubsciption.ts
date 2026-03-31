import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { subscriptionService } from '../services/subscriptionService';
import { SubscriptionDetails, BillingInvoice, DetailedPlan } from '../types/subscription';

export function useSubscription() {
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [history, setHistory] = useState<BillingInvoice[]>([]);
  const [plans, setPlans] = useState<DetailedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const [fetchedDetails, fetchedHistory, fetchedPlans] = await Promise.all([
        subscriptionService.getSubscriptionDetails(businessId),
        subscriptionService.getBillingHistory(businessId),
        subscriptionService.getAvailablePlans()
      ]);
      
      // If no details, provide default
      setDetails(fetchedDetails || {
        currentPlanId: 'free',
        status: 'active',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        usageLimits: [
          { name: 'Monthly Invoices', current: 2, max: 5, unit: 'invoices' },
          { name: 'Team Members', current: 1, max: 1, unit: 'members' }
        ]
      });
      setHistory(fetchedHistory);
      setPlans(fetchedPlans);
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError('Failed to load billing information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchData();
    }
  }, [businessId, fetchData]);

  const upgradePlan = async (planId: string) => {
    // In a real app, this would redirect to Stripe Checkout
    console.log('Upgrading to plan:', planId);
    return true;
  };

  return {
    details,
    history,
    plans,
    loading,
    error,
    upgradePlan,
    refresh: fetchData
  };
}
