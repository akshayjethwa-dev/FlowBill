import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Palette, Receipt, Bell, CreditCard,
  Users, Zap, Save, Loader2, CheckCircle2, AlertCircle,
  Menu, X, MessageCircle
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { BusinessProfileSection } from '../components/settings/BusinessProfileSection';
import { BrandingSection } from '../components/settings/BrandingSection';
import { GstSettingsSection } from '../components/settings/GstSettingsSection';
import { InvoiceSettingsSection } from '../components/settings/InvoiceSettingsSection';
import { ReminderSettingsSection } from '../components/settings/ReminderSettingsSection';
import { PaymentSettingsSection } from '../components/settings/PaymentSettingsSection';
import { TeamManagement } from '../components/settings/TeamManagement'; // ✅ NEW — replaces TeamSettingsSection
import { SubscriptionSection } from '../components/settings/SubscriptionSection';
import { WhatsappConfigSection } from '../components/settings/WhatsappConfigSection';
import { WhatsappTemplatesSection } from '../components/settings/WhatsappTemplatesSection';
import { AppSettings, SubscriptionPlan } from '../types/settings';

const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    billingCycle: 'monthly',
    features: ['Up to 5 invoices/mo', 'Basic templates', '1 Team member'],
    current: true,
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29,
    billingCycle: 'monthly',
    features: ['Unlimited invoices', 'Custom branding', 'Up to 5 team members', 'Priority support'],
    current: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    billingCycle: 'monthly',
    features: ['Custom workflows', 'API access', 'Unlimited team members', 'Dedicated account manager'],
    current: false,
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  businessProfile: { name: '', email: '', phone: '', address: '' },
  gstSettings: { enabled: false, gstRate: 18, inclusive: false },
  invoiceSettings: { prefix: 'INV-', nextNumber: 1, showLogo: true },
  reminderSettings: { enableEmailReminders: false, reminderDaysBefore: [3, 1], reminderDaysAfter: [1, 3, 7] },
  paymentSettings: {},
  subscriptionPlan: 'free',
};

export function SettingsPage() {
  const { settings, loading, error, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    const success = await updateSettings(localSettings);
    if (success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
    }
    setIsSaving(false);
  };

  // These sections manage their own save — hide the global Save button for them
  const sectionsWithOwnSave = ['whatsapp', 'watemplate', 'team'];
  const hideGlobalSave = sectionsWithOwnSave.includes(activeSection);

  const sections = [
    { id: 'profile',      label: 'Business Profile',  icon: Building2     },
    { id: 'branding',     label: 'Branding',          icon: Palette       },
    { id: 'gst',          label: 'GST Settings',      icon: Receipt       },
    { id: 'invoice',      label: 'Invoice Settings',  icon: Receipt       },
    { id: 'reminders',    label: 'Reminders',         icon: Bell          },
    { id: 'payments',     label: 'Payment Details',   icon: CreditCard    },
    { id: 'team',         label: 'Team Members',      icon: Users         },
    { id: 'whatsapp',     label: 'WhatsApp Setup',    icon: MessageCircle },
    { id: 'watemplate',   label: 'WA Templates',      icon: MessageCircle },
    { id: 'subscription', label: 'Subscription',      icon: Zap           },
  ];

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-center p-6 bg-red-50 rounded-2xl border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-red-900">Error Loading Settings</h3>
        <p className="text-red-700 mt-2 max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">

        {/* ── Sidebar Navigation ─────────────────────────────────── */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="md:hidden flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <div className={`space-y-1 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            <h2 className="hidden md:block text-2xl font-bold text-gray-900 mb-6">Settings</h2>
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    size={18}
                    className={activeSection === section.id ? 'text-blue-600' : 'text-gray-400'}
                  />
                  {section.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Main Content ───────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeSection === 'profile' && (
                    <BusinessProfileSection
                      profile={localSettings.businessProfile}
                      onChange={(profile) =>
                        setLocalSettings(prev => ({
                          ...prev,
                          businessProfile: { ...prev.businessProfile, ...profile },
                        }))
                      }
                    />
                  )}

                  {activeSection === 'branding' && (
                    <BrandingSection
                      logoUrl={localSettings.businessProfile.logoUrl}
                      onLogoChange={(url) =>
                        setLocalSettings(prev => ({
                          ...prev,
                          businessProfile: { ...prev.businessProfile, logoUrl: url },
                        }))
                      }
                    />
                  )}

                  {activeSection === 'gst' && (
                    <GstSettingsSection
                      settings={localSettings.gstSettings}
                      onChange={(gst) =>
                        setLocalSettings(prev => ({
                          ...prev,
                          gstSettings: { ...prev.gstSettings, ...gst },
                        }))
                      }
                    />
                  )}

                  {activeSection === 'invoice' && (
                    <InvoiceSettingsSection
                      settings={localSettings.invoiceSettings}
                      onChange={(invoice) =>
                        setLocalSettings(prev => ({
                          ...prev,
                          invoiceSettings: { ...prev.invoiceSettings, ...invoice },
                        }))
                      }
                    />
                  )}

                  {activeSection === 'reminders' && (
                    <ReminderSettingsSection
                      settings={localSettings.reminderSettings}
                      onChange={(reminders) =>
                        setLocalSettings(prev => ({
                          ...prev,
                          reminderSettings: { ...prev.reminderSettings, ...reminders },
                        }))
                      }
                    />
                  )}

                  {activeSection === 'payments' && (
                    <PaymentSettingsSection
                      settings={localSettings.paymentSettings}
                      onChange={(payments) =>
                        setLocalSettings(prev => ({
                          ...prev,
                          paymentSettings: { ...prev.paymentSettings, ...payments },
                        }))
                      }
                    />
                  )}

                  {/* ✅ TeamManagement replaces old TeamSettingsSection stub */}
                  {activeSection === 'team' && <TeamManagement />}

                  {activeSection === 'whatsapp' && <WhatsappConfigSection />}

                  {activeSection === 'watemplate' && <WhatsappTemplatesSection />}

                  {activeSection === 'subscription' && (
                    <SubscriptionSection
                      plans={MOCK_PLANS}
                      currentPlanId={localSettings.subscriptionPlan}
                      onUpgrade={(planId) =>
                        setLocalSettings(prev => ({ ...prev, subscriptionPlan: planId }))
                      }
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Footer: Global Save (hidden for team/whatsapp sections) ── */}
            {!hideGlobalSave && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {saveStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 text-green-600 text-sm font-medium"
                    >
                      <CheckCircle2 size={16} /> Settings saved successfully
                    </motion.div>
                  )}
                  {saveStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 text-red-600 text-sm font-medium"
                    >
                      <AlertCircle size={16} /> Failed to save settings
                    </motion.div>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {isSaving
                    ? <><Loader2 size={18} className="mr-2 animate-spin" />Saving...</>
                    : <><Save size={18} className="mr-2" />Save Changes</>
                  }
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}