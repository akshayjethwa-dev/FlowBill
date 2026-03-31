import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { SubscriptionDetails, BillingInvoice, DetailedPlan } from '../types/subscription';

const SUBSCRIPTION_COLLECTION = 'subscriptions';
const BILLING_HISTORY_COLLECTION = 'billing_history';

export const subscriptionService = {
  async getSubscriptionDetails(businessId: string): Promise<SubscriptionDetails | null> {
    const subDoc = await getDoc(doc(db, SUBSCRIPTION_COLLECTION, businessId));
    if (subDoc.exists()) {
      return subDoc.data() as SubscriptionDetails;
    }
    return null;
  },

  async getBillingHistory(businessId: string): Promise<BillingInvoice[]> {
    const billingQuery = query(
      collection(db, BILLING_HISTORY_COLLECTION),
      where('businessId', '==', businessId),
      orderBy('date', 'desc'),
      limit(10)
    );
    const billingSnapshot = await getDocs(billingQuery);
    return billingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BillingInvoice));
  },

  // Mock plans for the UI
  async getAvailablePlans(): Promise<DetailedPlan[]> {
    return [
      {
        id: 'free',
        name: 'Starter',
        price: 0,
        billingCycle: 'monthly',
        description: 'Perfect for small businesses starting out.',
        features: ['Up to 5 invoices/mo', 'Basic templates', '1 Team member'],
        detailedFeatures: [
          { name: 'Monthly Invoices', included: '5' },
          { name: 'Team Members', included: '1' },
          { name: 'Custom Branding', included: false },
          { name: 'API Access', included: false },
          { name: 'Priority Support', included: false },
        ],
        current: false
      },
      {
        id: 'pro',
        name: 'Professional',
        price: 29,
        billingCycle: 'monthly',
        description: 'Everything you need to grow your business.',
        features: ['Unlimited invoices', 'Custom branding', 'Up to 5 team members', 'Priority support'],
        detailedFeatures: [
          { name: 'Monthly Invoices', included: 'Unlimited' },
          { name: 'Team Members', included: '5' },
          { name: 'Custom Branding', included: true },
          { name: 'API Access', included: false },
          { name: 'Priority Support', included: true },
        ],
        current: false
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99,
        billingCycle: 'monthly',
        description: 'Advanced features for large organizations.',
        features: ['Custom workflows', 'API access', 'Unlimited team members', 'Dedicated account manager'],
        detailedFeatures: [
          { name: 'Monthly Invoices', included: 'Unlimited' },
          { name: 'Team Members', included: 'Unlimited' },
          { name: 'Custom Branding', included: true },
          { name: 'API Access', included: true },
          { name: 'Priority Support', included: '24/7 Dedicated' },
        ],
        current: false
      }
    ];
  }
};
