import React from 'react';
import { InvoiceSettings } from '../../types/settings';

interface Props {
  settings: InvoiceSettings;
  onChange: (settings: Partial<InvoiceSettings>) => void;
}

export function InvoiceSettingsSection({ settings, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (type === 'checkbox') {
      onChange({ [name]: checked });
    } else if (name === 'nextNumber') {
      onChange({ [name]: parseInt(value) || 0 });
    } else {
      onChange({ [name]: value });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Invoice Settings</h3>
      <p className="text-sm text-gray-500">Customize how your invoices are generated.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice Prefix</label>
          <input
            type="text"
            name="prefix"
            value={settings.prefix}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="INV-"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Invoice Number</label>
          <input
            type="number"
            name="nextNumber"
            value={settings.nextNumber}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="1001"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Footer Text</label>
          <textarea
            name="footerText"
            value={settings.footerText || ''}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all resize-none"
            placeholder="Thank you for your business!"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Terms & Conditions</label>
          <textarea
            name="termsAndConditions"
            value={settings.termsAndConditions || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all resize-none"
            placeholder="Payment is due within 30 days."
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            name="showLogo"
            id="show-logo"
            checked={settings.showLogo}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="show-logo" className="text-sm text-gray-700">Show logo on invoices</label>
        </div>
      </div>
    </div>
  );
}
