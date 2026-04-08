import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { SubscriptionDetails, BillingInvoice, DetailedPlan } from '../types/subscription';
import { ServiceResult } from '../types/firestore';
import { FSPath } from '../lib/models/paths';

// Reads from /merchants/{merchantId}/subscriptions/{merchantId}
export async function getSubscriptionDetails(
  merchantId: string,
): Promise<ServiceResult<SubscriptionDetails>> {
  const path = FSPath.subscription(merchantId, merchantId);
  try {
    const snap = await getDoc(doc(db, path));
    if (!snap.exists()) {
      return { ok: false, error: { code: 'not-found', message: 'Subscription not found', path, operation: 'get' } };
    }
    return { ok: true, data: snap.data() as SubscriptionDetails };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'get', raw: e } };
  }
}

export async function getBillingHistory(
  merchantId: string,
  limitCount = 10,
): Promise<ServiceResult<BillingInvoice[]>> {
  const path = `${FSPath.subscription(merchantId, merchantId)}/billing_history`;
  try {
    const q = query(
      collection(db, path),
      where('merchantId', '==', merchantId),
      orderBy('date', 'desc'),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    return { ok: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() } as BillingInvoice)) };
  } catch (e: any) {
    return { ok: false, error: { code: e.code ?? 'unknown', message: e.message, path, operation: 'list', raw: e } };
  }
}

export async function getAvailablePlans(): Promise<ServiceResult<DetailedPlan[]>> {
  const plans: DetailedPlan[] = [
    {
      id: 'free', name: 'Starter', price: 0, billingCycle: 'monthly',
      description: 'Perfect for small businesses starting out.',
      features: ['Up to 5 invoices/mo', 'Basic templates', '1 Team member'],
      detailedFeatures: [
        { name: 'Monthly Invoices', included: '5' },
        { name: 'Team Members', included: '1' },
        { name: 'Custom Branding', included: false },
        { name: 'API Access', included: false },
        { name: 'Priority Support', included: false },
      ],
      current: false,
    },
    {
      id: 'pro', name: 'Professional', price: 29, billingCycle: 'monthly',
      description: 'Everything you need to grow your business.',
      features: ['Unlimited invoices', 'Custom branding', 'Up to 5 team members', 'Priority support'],
      detailedFeatures: [
        { name: 'Monthly Invoices', included: 'Unlimited' },
        { name: 'Team Members', included: '5' },
        { name: 'Custom Branding', included: true },
        { name: 'API Access', included: false },
        { name: 'Priority Support', included: true },
      ],
      current: false,
    },
    {
      id: 'enterprise', name: 'Enterprise', price: 99, billingCycle: 'monthly',
      description: 'Advanced features for large organizations.',
      features: ['Custom workflows', 'API access', 'Unlimited team members', 'Dedicated account manager'],
      detailedFeatures: [
        { name: 'Monthly Invoices', included: 'Unlimited' },
        { name: 'Team Members', included: 'Unlimited' },
        { name: 'Custom Branding', included: true },
        { name: 'API Access', included: true },
        { name: 'Priority Support', included: '24/7 Dedicated' },
      ],
      current: false,
    },
  ];
  return { ok: true, data: plans };
}

export const subscriptionService = {
  getSubscriptionDetails,
  getBillingHistory,
  getAvailablePlans,
};