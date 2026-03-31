import React from 'react';
import { PaymentSettings } from '../../types/settings';

interface Props {
  settings: PaymentSettings;
  onChange: (settings: Partial<PaymentSettings>) => void;
}

export function PaymentSettingsSection({ settings, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
      <p className="text-sm text-gray-500">Add your bank account or UPI details to receive payments.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Name</label>
          <input
            type="text"
            name="bankName"
            value={settings.bankName || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="HDFC Bank"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Number</label>
          <input
            type="text"
            name="accountNumber"
            value={settings.accountNumber || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="0000 0000 0000"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">IFSC Code</label>
          <input
            type="text"
            name="ifscCode"
            value={settings.ifscCode || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="HDFC0001234"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">UPI ID</label>
          <input
            type="text"
            name="upiId"
            value={settings.upiId || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="acme@upi"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Instructions</label>
          <textarea
            name="paymentInstructions"
            value={settings.paymentInstructions || ''}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all resize-none"
            placeholder="Please mention invoice number in the payment reference."
          />
        </div>
      </div>
    </div>
  );
}
