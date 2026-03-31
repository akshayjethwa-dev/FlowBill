import React from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

interface Props {
  logoUrl?: string;
  onLogoChange: (url: string) => void;
}

export function BrandingSection({ logoUrl, onLogoChange }: Props) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, we'd upload to Firebase Storage
      // For now, we'll use a local object URL as a placeholder
      const url = URL.createObjectURL(file);
      onLogoChange(url);
    }
  };

  const removeLogo = () => {
    onLogoChange('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Branding</h3>
      <p className="text-sm text-gray-500">Upload your business logo to appear on invoices and reports.</p>
      
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden group">
          {logoUrl ? (
            <>
              <img src={logoUrl} alt="Business Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
              <button
                onClick={removeLogo}
                className="absolute top-1 right-1 p-1 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <ImageIcon size={32} strokeWidth={1.5} />
              <span className="text-[10px] mt-2 font-semibold uppercase tracking-wider">No Logo</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-all shadow-sm">
            <Upload size={16} className="mr-2" />
            Upload New Logo
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
          <p className="text-xs text-gray-400">Recommended: Square PNG or SVG, max 2MB.</p>
        </div>
      </div>
    </div>
  );
}
