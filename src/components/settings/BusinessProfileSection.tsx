import React from 'react';
import { BusinessProfile } from '../../types/settings';

interface Props {
  profile: BusinessProfile;
  onChange: (profile: Partial<BusinessProfile>) => void;
}

export function BusinessProfileSection({ profile, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Business Profile</h3>
      <p className="text-sm text-gray-500">Manage your business contact information.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Business Name</label>
          <input
            type="text"
            name="name"
            value={profile.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="Acme Corp"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            name="email"
            value={profile.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="hello@acme.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Website</label>
          <input
            type="url"
            name="website"
            value={profile.website || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="https://acme.com"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</label>
          <textarea
            name="address"
            value={profile.address}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all resize-none"
            placeholder="123 Business St, Suite 100, City, State, ZIP"
          />
        </div>
      </div>
    </div>
  );
}
