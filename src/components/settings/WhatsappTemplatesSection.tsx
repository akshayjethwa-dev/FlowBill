// src/components/settings/WhatsappTemplatesSection.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  upsertTemplate, deleteTemplate,
  subscribeToWhatsappTemplates,
  WhatsappTemplate, UpsertTemplateInput,
} from '../../lib/whatsappApi';

const BLANK_FORM: UpsertTemplateInput = {
  templateKey:        '',
  providerTemplateId: '',
  category:           'utility',
  language:           'en',
  sampleBody:         '',
  paramOrder:         [],
};

const PRESET_KEYS = [
  'invoice_shared',
  'payment_due_soon',
  'payment_overdue',
  'payment_received',
  'estimate_followup',
  'manual_reminder',
];

export function WhatsappTemplatesSection() {
  const [templates, setTemplates]   = useState<WhatsappTemplate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<UpsertTemplateInput>(BLANK_FORM);
  const [paramInput, setParamInput] = useState('');
  const [errors, setErrors]         = useState<Partial<Record<keyof UpsertTemplateInput | 'paramOrder', string>>>({});
  const [saving, setSaving]         = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [feedback, setFeedback]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToWhatsappTemplates(
      (data) => { setTemplates(data); setLoading(false); },
      ()     => setLoading(false)
    );
    return unsub;
  }, []);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.templateKey.trim()) {
      errs.templateKey = 'Template key is required.';
    } else if (!/^[a-z0-9_]+$/.test(form.templateKey.trim())) {
      errs.templateKey = 'Only lowercase letters, digits, underscores allowed.';
    }
    if (!form.providerTemplateId.trim()) {
      errs.providerTemplateId = 'Provider Template ID is required (from Gupshup console).';
    }
    if (!form.paramOrder || form.paramOrder.length === 0) {
      errs.paramOrder = 'At least one parameter is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addParam = () => {
    const p = paramInput.trim();
    if (!p) return;
    if (form.paramOrder.includes(p)) {
      setErrors((prev) => ({ ...prev, paramOrder: `"${p}" already exists.` }));
      return;
    }
    setForm((prev) => ({ ...prev, paramOrder: [...prev.paramOrder, p] }));
    setParamInput('');
    setErrors((prev) => ({ ...prev, paramOrder: undefined }));
  };

  const removeParam = (p: string) => {
    setForm((prev) => ({ ...prev, paramOrder: prev.paramOrder.filter((x) => x !== p) }));
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await upsertTemplate({ ...form, templateKey: form.templateKey.trim(), providerTemplateId: form.providerTemplateId.trim() });
      showFeedback('success', `Template "${form.templateKey}" saved.`);
      setShowForm(false);
      setForm(BLANK_FORM);
      setParamInput('');
    } catch (err: any) {
      showFeedback('error', err?.message ?? 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: WhatsappTemplate) => {
    setForm({
      templateKey:        t.templateKey,
      providerTemplateId: t.providerTemplateId,
      category:           t.category,
      language:           t.language ?? 'en',
      sampleBody:         t.sampleBody ?? '',
      paramOrder:         t.paramOrder,
    });
    setErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete template "${key}"? This cannot be undone.`)) return;
    setDeletingKey(key);
    try {
      await deleteTemplate(key);
      showFeedback('success', `Template "${key}" deleted.`);
    } catch (err: any) {
      showFeedback('error', err?.message ?? 'Failed to delete.');
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">WhatsApp Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage approved Gupshup message templates</p>
        </div>
        <button
          onClick={() => { setForm(BLANK_FORM); setErrors({}); setParamInput(''); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Template
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${
          feedback.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.msg}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="border border-green-200 bg-green-50/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{form.templateKey ? `Editing: ${form.templateKey}` : 'New Template'}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template Key */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Template Key <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  list="preset-keys"
                  type="text"
                  value={form.templateKey}
                  onChange={(e) => { setForm((p) => ({ ...p, templateKey: e.target.value.toLowerCase() })); setErrors((p) => ({ ...p, templateKey: undefined })); }}
                  placeholder="e.g. payment_due_soon"
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.templateKey ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                />
                <datalist id="preset-keys">
                  {PRESET_KEYS.map((k) => <option key={k} value={k} />)}
                </datalist>
              </div>
              {errors.templateKey && <p className="mt-1 text-xs text-red-600">{errors.templateKey}</p>}
              <p className="mt-1 text-xs text-gray-400">Unique internal identifier. Lowercase + underscores only.</p>
            </div>

            {/* Provider Template ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Gupshup Template ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.providerTemplateId}
                onChange={(e) => { setForm((p) => ({ ...p, providerTemplateId: e.target.value })); setErrors((p) => ({ ...p, providerTemplateId: undefined })); }}
                placeholder="e.g. c6aecef6-bcb0-4fb1-8100-28c094e3bc6b"
                className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.providerTemplateId ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
              />
              {errors.providerTemplateId && <p className="mt-1 text-xs text-red-600">{errors.providerTemplateId}</p>}
              <p className="mt-1 text-xs text-gray-400">Copy UUID from Gupshup Console → Templates</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="utility">Utility</option>
                <option value="marketing">Marketing</option>
                <option value="auth">Authentication</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="en">English (en)</option>
                <option value="hi">Hindi (hi)</option>
                <option value="gu">Gujarati (gu)</option>
                <option value="mr">Marathi (mr)</option>
              </select>
            </div>
          </div>

          {/* Sample Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Sample Body (optional)</label>
            <textarea
              value={form.sampleBody}
              onChange={(e) => setForm((p) => ({ ...p, sampleBody: e.target.value }))}
              rows={2}
              placeholder="Hi {{1}}, your invoice {{2}} of ₹{{3}} is due."
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Param Order */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Parameter Order <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={paramInput}
                onChange={(e) => setParamInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParam())}
                placeholder="e.g. customerName"
                className="flex-1 px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={addParam}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-all"
              >
                Add
              </button>
            </div>
            {errors.paramOrder && <p className="mb-2 text-xs text-red-600">{errors.paramOrder}</p>}
            {form.paramOrder.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.paramOrder.map((p, i) => (
                  <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-mono text-gray-700 shadow-sm">
                    <span className="text-gray-400">{'{{' + (i + 1) + '}}'} </span>{p}
                    <button onClick={() => removeParam(p)} className="text-gray-400 hover:text-red-500 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Order matters — {'{{1}}'} maps to the first param, {'{{2}}'} to the second, etc.
            </p>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-all"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4" /> Save Template</>}
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-400 text-sm">No templates yet. Click "Add Template" to create your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.templateKey} className="border border-gray-200 bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="font-mono text-sm font-semibold text-gray-800">{t.templateKey}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  t.category === 'utility'    ? 'bg-blue-100 text-blue-700' :
                  t.category === 'marketing'  ? 'bg-purple-100 text-purple-700' :
                                                'bg-orange-100 text-orange-700'
                }`}>{t.category}</span>
                <span className="text-xs text-gray-400 ml-auto">{t.language}</span>
                <button
                  onClick={() => setExpandedKey(expandedKey === t.templateKey ? null : t.templateKey)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  {expandedKey === t.templateKey ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => handleEdit(t)} className="text-blue-500 hover:text-blue-700 text-xs font-medium ml-1">Edit</button>
                <button
                  onClick={() => handleDelete(t.templateKey)}
                  disabled={deletingKey === t.templateKey}
                  className="text-red-400 hover:text-red-600 ml-1"
                >
                  {deletingKey === t.templateKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>

              {expandedKey === t.templateKey && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2 text-xs text-gray-600">
                  <p><span className="font-semibold text-gray-700">Provider ID:</span> <span className="font-mono">{t.providerTemplateId}</span></p>
                  {t.sampleBody && <p><span className="font-semibold text-gray-700">Sample:</span> {t.sampleBody}</p>}
                  <p>
                    <span className="font-semibold text-gray-700">Params:</span>{' '}
                    {t.paramOrder.map((p, i) => (
  <span key={p} className="inline-flex items-center gap-1 mr-2 font-mono bg-gray-100 px-2 py-0.5 rounded-md">
    {'{{' + (i + 1) + '}}'} {p}
  </span>
))}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}