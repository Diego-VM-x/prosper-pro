/**
 * VEPay API Client
 * Extracts structured payment data from Venezuelan mobile banking receipt screenshots.
 * OCR is performed client-side with tesseract.js; parsed text is sent to /api/vepay/parse.
 * Based on: https://github.com/jp72924/vepay-api
 */

import type { VEPayParseResponse } from '@/types';
export type { VEPayReceipt, VEPayParseResponse } from '@/types';
export { VEPAY_BANKS, parseAmount, detectTransactionType, getBankDisplayName, mapReceiptToTransaction } from '@/lib/vepay-data';

async function extractTextFromImage(file: File, onProgress?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker('spa+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round((m.progress || 0) * 100));
      }
    },
  });

  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

export async function parseReceipt(file: File, onProgress?: (p: number) => void): Promise<VEPayParseResponse> {
  const ocrText = await extractTextFromImage(file, onProgress);

  const { parseMultipleOcrTexts } = await import('@/lib/vepay-core');
  const result = parseMultipleOcrTexts(
    [{ text: ocrText, filename: file.name }],
    { includeRawText: false }
  );

  return {
    request_id: crypto.randomUUID?.() || Date.now().toString(16),
    schema_version: 'vepay_api_receipt_v1',
    receipts: result.receipts,
    summary: {
      total: 1,
      complete: result.receipts.filter(r => r.validation.is_complete).length,
      incomplete: result.receipts.filter(r => !r.validation.is_complete).length,
      errors: result.errors.length,
    },
    errors: result.errors,
  };
}

export async function parseMultipleReceipts(files: File[], onProgress?: (filename: string, p: number) => void): Promise<VEPayParseResponse> {
  const texts: Array<{ text: string; filename: string }> = [];

  for (const file of files) {
    const ocrText = await extractTextFromImage(file, (p) => {
      if (onProgress) onProgress(file.name, p);
    });
    texts.push({ text: ocrText, filename: file.name });
  }

  const { parseMultipleOcrTexts } = await import('@/lib/vepay-core');
  const result = parseMultipleOcrTexts(texts, { includeRawText: false });

  return {
    request_id: crypto.randomUUID?.() || Date.now().toString(16),
    schema_version: 'vepay_api_receipt_v1',
    receipts: result.receipts,
    summary: {
      total: texts.length,
      complete: result.receipts.filter(r => r.validation.is_complete).length,
      incomplete: result.receipts.filter(r => !r.validation.is_complete).length,
      errors: result.errors.length,
    },
    errors: result.errors,
  };
}
