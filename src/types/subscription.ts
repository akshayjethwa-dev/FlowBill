import { SubscriptionPlan } from './settings';

export interface UsageLimit {
  name: string;
  current: number;
  max: number;
  unit: string;
}

export interface BillingInvoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
}

export interface SubscriptionDetails {
  currentPlanId: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  nextBillingDate: string;
  usageLimits: UsageLimit[];
}

export interface PlanFeature {
  name: string;
  included: boolean | string;
}

export interface DetailedPlan extends SubscriptionPlan {
  description: string;
  detailedFeatures: PlanFeature[];
}
