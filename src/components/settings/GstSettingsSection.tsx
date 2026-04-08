import React from 'react';
import { GstSettings } from '../../types/settings';

interface Props {
  settings: GstSettings;
  onChange: (settings: Partial<GstSettings>) => void;
}

export function GstSettingsSection({ settings, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (type === 'checkbox') {
      onChange({ [name]: checked });
    } else if (name === 'gstRate') {
      onChange({ [name]: parseFloat(value) });
    } else {
      onChange({ [name]: value });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">GST Settings</h3>
          <p className="text-sm text-gray-500">Configure your tax registration and rates.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="enabled"
            checked={settings.enabled}
            onChange={handleChange}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-900">Enable GST</span>
        </label>
      </div>

      {settings.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GST Number</label>
            <input
              type="text"
              name="gstNumber"
              value={settings.gstNumber || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              placeholder="22AAAAA0000A1Z5"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Default GST Rate (%)</label>
            <input
              type="number"
              name="gstRate"
              value={settings.gstRate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              placeholder="18"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              name="inclusive"
              id="gst-inclusive"
              checked={settings.inclusive}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="gst-inclusive" className="text-sm text-gray-700">Prices are inclusive of GST</label>
          </div>
        </div>
      )}
    </div>
  );
}
