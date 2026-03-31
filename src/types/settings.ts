export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  logoUrl?: string;
}

export interface GstSettings {
  enabled: boolean;
  gstNumber?: string;
  gstRate: number;
  inclusive: boolean;
}

export interface InvoiceSettings {
  prefix: string;
  nextNumber: number;
  footerText?: string;
  termsAndConditions?: string;
  showLogo: boolean;
}

export interface ReminderSettings {
  enableEmailReminders: boolean;
  reminderDaysBefore: number[];
  reminderDaysAfter: number[];
}

export interface PaymentSettings {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  paymentInstructions?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'invited';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  current: boolean;
}

export interface AppSettings {
  businessProfile: BusinessProfile;
  gstSettings: GstSettings;
  invoiceSettings: InvoiceSettings;
  reminderSettings: ReminderSettings;
  paymentSettings: PaymentSettings;
  subscriptionPlan: string; // plan id
}
