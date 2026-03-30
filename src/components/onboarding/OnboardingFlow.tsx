import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronRight, ChevronLeft, Store, User, CreditCard, PartyPopper } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { merchantService } from '../../services/merchantService';
import { Merchant } from '../../types';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const STEPS = [
  { id: 'business', title: 'Business', icon: Store },
  { id: 'owner', title: 'Owner', icon: User },
  { id: 'payment', title: 'Payment', icon: CreditCard },
  { id: 'success', title: 'Done', icon: PartyPopper },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Merchant>>({
    businessName: '',
    ownerName: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    category: 'Retail',
    gstin: '',
    upiId: '',
    address: '',
  });

  const updateField = (field: keyof Merchant, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await merchantService.saveMerchantOnboarding(user.uid, formData);
      setCurrentStep(3); // Move to success step
    } catch (error) {
      console.error("Onboarding failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Tell us about your business</h2>
              <p className="text-gray-500">This helps us set up your digital ledger.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  placeholder="e.g. Sharma Kirana Store"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Category *</label>
                <select 
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                >
                  <option>Retail</option>
                  <option>Wholesale</option>
                  <option>Restaurant</option>
                  <option>Service</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN (Optional)</label>
                <input 
                  type="text" 
                  value={formData.gstin}
                  onChange={(e) => updateField('gstin', e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <button 
              disabled={!formData.businessName}
              onClick={handleNext}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        );
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Contact Details</h2>
              <p className="text-gray-500">How can we reach you?</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.ownerName}
                  onChange={(e) => updateField('ownerName', e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number *</label>
                <div className="flex gap-2">
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium">+91</div>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="98765 43210"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="name@business.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleBack} className="flex-1 px-4 py-4 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
              <button 
                disabled={!formData.ownerName || !formData.phone}
                onClick={handleNext}
                className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                Continue <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Payment & Address</h2>
              <p className="text-gray-500">Set up your collection details.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID (for collection)</label>
                <input 
                  type="text" 
                  value={formData.upiId}
                  onChange={(e) => updateField('upiId', e.target.value)}
                  placeholder="username@okaxis"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">This will be printed on your invoices.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                <textarea 
                  rows={3}
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Shop No, Street, City, State, PIN"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleBack} className="flex-1 px-4 py-4 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
              <button 
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Complete Setup'} <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <PartyPopper className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">You're all set!</h2>
            <p className="text-gray-500 mb-10 max-w-xs mx-auto">
              Your business profile is ready. You can now start creating orders and invoices.
            </p>
            <button 
              onClick={onComplete}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Go to Dashboard
            </button>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Stepper */}
        {currentStep < 3 && (
          <div className="flex items-center justify-between mb-12 px-2">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = currentStep > idx;
              const isActive = currentStep === idx;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted ? 'bg-green-500 text-white' : 
                      isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 
                      'bg-white text-gray-400 border border-gray-200'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                      {step.title}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 h-px bg-gray-200 mx-2 -mt-6">
                      <motion.div 
                        initial={{ width: '0%' }}
                        animate={{ width: isCompleted ? '100%' : '0%' }}
                        className="h-full bg-green-500"
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 overflow-hidden">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          Step {currentStep + 1} of 4 • VyaparFlow Onboarding
        </p>
      </div>
    </div>
  );
};
