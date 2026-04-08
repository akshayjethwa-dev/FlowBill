// src/components/settings/WhatsappConfigSection.tsx
import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, Loader2, CheckCircle2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { setupWhatsappConfig, subscribeToWhatsappConfig, WhatsappConfig } from '../../lib/whatsappApi';

export function WhatsappConfigSection() {
  const [config, setConfig]             = useState<WhatsappConfig | null>(null);
  const [loading, setLoading]           = useState(true);
  const [businessNumber, setBusinessNumber] = useState('');
  const [appName, setAppName]           = useState('');
  const [saving, setSaving]             = useState(false);
  const [status, setStatus]             = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg]         = useState('');
  const [errors, setErrors]             = useState<{ businessNumber?: string; appName?: string }>({});

  useEffect(() => {
    const unsub = subscribeToWhatsappConfig(
      (data) => {
        setConfig(data);
        if (data) {
          setBusinessNumber(data.businessNumber ?? '');
          setAppName(data.appName ?? '');
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const validate = (): boolean => {
    const errs: typeof errors = {};
    const digits = businessNumber.replace(/\D/g, '');
    if (!digits) {
      errs.businessNumber = 'Business WhatsApp number is required.';
    } else if (digits.length < 10 || digits.length > 15) {
      errs.businessNumber = 'Enter a valid phone number with country code (e.g. 919876543210).';
    }
    if (!appName.trim()) {
      errs.appName = 'App name is required (copy from Gupshup console).';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setStatus('idle');
    setErrorMsg('');
    try {
      await setupWhatsappConfig({ businessNumber, appName: appName.trim() });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message ?? 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-8">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading WhatsApp config...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-xl">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">WhatsApp Configuration</h2>
          <p className="text-sm text-gray-500">Connect your Gupshup WhatsApp Business account</p>
        </div>
        {config && (
          <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            config.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {config.status === 'active'
              ? <><Wifi className="w-3 h-3" /> Active</>
              : <><WifiOff className="w-3 h-3" /> {config.status}</>}
          </span>
        )}
      </div>

      {/* Current config summary */}
      {config && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm space-y-1">
          <p className="text-gray-500">Current number: <span className="font-mono text-gray-800">+{config.businessNumber}</span></p>
          <p className="text-gray-500">App name: <span className="font-medium text-gray-800">{config.appName}</span></p>
          <p className="text-gray-500">Provider: <span className="font-medium text-gray-800 capitalize">{config.provider}</span></p>
          {config.lastError && (
            <p className="text-red-600 flex items-center gap-1 mt-2">
              <AlertCircle className="w-3.5 h-3.5" /> {config.lastError}
            </p>
          )}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            WhatsApp Business Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={businessNumber}
            onChange={(e) => { setBusinessNumber(e.target.value); setErrors((p) => ({ ...p, businessNumber: undefined })); }}
            placeholder="919876543210 (with country code, no spaces)"
            className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
              errors.businessNumber ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          />
          {errors.businessNumber && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.businessNumber}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">E.164 format without the + sign. Example: 919876543210</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Gupshup App Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => { setAppName(e.target.value); setErrors((p) => ({ ...p, appName: undefined })); }}
            placeholder="e.g. FlowBillProd"
            className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
              errors.appName ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          />
          {errors.appName && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.appName}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">Find this in Gupshup Console → your app's Overview page</p>
        </div>
      </div>

      {/* Feedback */}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4" /> WhatsApp configuration saved successfully.
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Configuration</>}
      </button>
    </div>
  );
}