import React from 'react';
import { ReminderSettings } from '../../types/settings';

interface Props {
  settings: ReminderSettings;
  onChange: (settings: Partial<ReminderSettings>) => void;
}

export function ReminderSettingsSection({ settings, onChange }: Props) {
  const handleToggle = () => {
    onChange({ enableEmailReminders: !settings.enableEmailReminders });
  };

  const handleDaysChange = (type: 'before' | 'after', value: string) => {
    const days = value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    if (type === 'before') {
      onChange({ reminderDaysBefore: days });
    } else {
      onChange({ reminderDaysAfter: days });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Reminders</h3>
          <p className="text-sm text-gray-500">Automate payment reminders for your clients.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enableEmailReminders}
            onChange={handleToggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-900">Enable Email Reminders</span>
        </label>
      </div>

      {settings.enableEmailReminders && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Days Before Due Date</label>
            <input
              type="text"
              value={settings.reminderDaysBefore.join(', ')}
              onChange={(e) => handleDaysChange('before', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              placeholder="3, 1"
            />
            <p className="text-[10px] text-gray-400">Comma separated days (e.g., 3, 1)</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Days After Due Date</label>
            <input
              type="text"
              value={settings.reminderDaysAfter.join(', ')}
              onChange={(e) => handleDaysChange('after', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              placeholder="1, 3, 7"
            />
            <p className="text-[10px] text-gray-400">Comma separated days (e.g., 1, 3, 7)</p>
          </div>
        </div>
      )}
    </div>
  );
}
