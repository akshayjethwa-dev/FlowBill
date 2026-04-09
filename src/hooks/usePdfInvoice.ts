// src/hooks/usePdfInvoice.ts
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

interface PdfResult {
  pdfUrl: string;
  storagePath: string;
}

export const usePdfInvoice = () => {
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calls generateInvoicePdf Cloud Function.
   * Returns a 1-hour signed URL, then auto-opens it for download.
   */
  const generatePdf = async (
    merchantId: string,
    invoiceId: string,
    invoiceNumber: string,
  ): Promise<string | null> => {
    setGenerating(true);
    setError(null);
    try {
      const fn     = httpsCallable<{ merchantId: string; invoiceId: string }, PdfResult>(
        functions, 'generateInvoicePdf'
      );
      const result = await fn({ merchantId, invoiceId });
      const url    = result.data.pdfUrl;

      // Auto-download
      _triggerDownload(url, `Invoice-${invoiceNumber}.pdf`);
      return url;
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to generate PDF.';
      setError(msg);
      return null;
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Calls getInvoicePdfUrl to get a fresh signed URL for an already-generated PDF.
   */
  const downloadPdf = async (
    merchantId: string,
    invoiceId: string,
    invoiceNumber: string,
  ): Promise<void> => {
    setDownloading(true);
    setError(null);
    try {
      const fn     = httpsCallable<{ merchantId: string; invoiceId: string }, { pdfUrl: string }>(
        functions, 'getInvoicePdfUrl'
      );
      const result = await fn({ merchantId, invoiceId });
      _triggerDownload(result.data.pdfUrl, `Invoice-${invoiceNumber}.pdf`);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return { generatePdf, downloadPdf, generating, downloading, error };
};

// Opens a signed URL in a new tab (works across all browsers)
function _triggerDownload(url: string, _filename: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}