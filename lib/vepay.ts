/**
 * VEPay API Client
 * Extracts structured payment data from Venezuelan mobile banking receipt screenshots.
 * OCR is performed client-side with tesseract.js; parsed text is sent to /api/vepay/parse.
 * Based on: https://github.com/jp72924/vepay-api
 */

import type {
  VEPayReceipt,
  VEPayParseResponse,
} from '@/types';

export type {
  VEPayReceipt,
  VEPayParseResponse,
  VEPayParseError,
  VEPayPayment,
  VEPayAmount,
  VEPayDateTime,
  VEPayOrigin,
  VEPayRecipient,
  VEPayValidation,
  VEPayBankApp,
  VEPayStatus,
} from '@/types';

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

  const response = await fetch('/api/vepay/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts: [{ text: ocrText, filename: file.name }],
      includeRawText: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error al procesar captura: ${text}`);
  }

  return response.json();
}

export async function parseMultipleReceipts(files: File[], onProgress?: (filename: string, p: number) => void): Promise<VEPayParseResponse> {
  const texts: Array<{ text: string; filename: string }> = [];

  for (const file of files) {
    const ocrText = await extractTextFromImage(file, (p) => {
      if (onProgress) onProgress(file.name, p);
    });
    texts.push({ text: ocrText, filename: file.name });
  }

  const response = await fetch('/api/vepay/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts,
      includeRawText: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error al procesar capturas: ${text}`);
  }

  return response.json();
}

export function parseAmount(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function detectTransactionType(receipt: VEPayReceipt): 'income' | 'expense' | 'saving' {
  const concept = (receipt.payment.concept || '').toLowerCase();

  if (concept.includes('pago') || concept.includes('transfer') || concept.includes('envio') || concept.includes('compra')) {
    return 'expense';
  }
  if (concept.includes('recibo') || concept.includes('deposito') || concept.includes('abono')) {
    return 'income';
  }
  return 'expense';
}

export function mapReceiptToTransaction(receipt: VEPayReceipt): {
  amount: number;
  type: 'income' | 'expense' | 'saving';
  category: string;
  description: string;
  date: number;
  reference: string;
  bank: string;
} {
  const amount = parseAmount(receipt.payment.amount.value);
  const type = detectTransactionType(receipt);
  const bank = receipt.payment.bank_app || receipt.recipient.bank || receipt.origin.bank || 'Desconocido';
  const reference = receipt.payment.reference || '';

  let category = 'Otro';
  const concept = (receipt.payment.concept || '').toLowerCase();
  if (concept.includes('comida') || concept.includes('restaurante') || concept.includes('mercado')) category = 'Comida';
  else if (concept.includes('transporte') || concept.includes('gasolina') || concept.includes('uber')) category = 'Transporte';
  else if (concept.includes('vivienda') || concept.includes('alquiler') || concept.includes('servicio')) category = 'Vivienda';
  else if (concept.includes('salud') || concept.includes('medico') || concept.includes('farmacia')) category = 'Salud';
  else if (concept.includes('educacion') || concept.includes('colegio') || concept.includes('curso')) category = 'Educación';
  else if (concept.includes('entretenimiento') || concept.includes('cine') || concept.includes('juego')) category = 'Entretenimiento';
  else if (concept.includes('nomina') || concept.includes('salario') || concept.includes('pago')) category = 'Salario';
  else if (concept.includes('ahorro') || concept.includes('inversión')) category = 'Ahorro';

  const description = receipt.payment.concept
    ? `${bank}: ${receipt.payment.concept}`
    : `Pago ${bank}${reference ? ` (Ref: ${reference})` : ''}`;

  let date = Date.now();
  if (receipt.payment.date_time.iso) {
    const parsed = new Date(receipt.payment.date_time.iso);
    if (!isNaN(parsed.getTime())) date = parsed.getTime();
  } else if (receipt.payment.date_time.raw) {
    const parsed = new Date(receipt.payment.date_time.raw);
    if (!isNaN(parsed.getTime())) date = parsed.getTime();
  }

  return { amount, type, category, description, date, reference, bank };
}
