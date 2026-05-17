/**
 * VEPay API Client
 * Extracts structured payment data from Venezuelan mobile banking receipt screenshots.
 * OCR is performed client-side with tesseract.js; parsed text is sent to /api/vepay/parse.
 * Based on: https://github.com/jp72924/vepay-api
 */

import { createWorker } from 'tesseract.js';
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
  VEPayFlow,
} from '@/types';

// Venezuelan bank display names
const BANK_DISPLAY_NAMES: Record<string, string> = {
  bdv: 'Banco de Venezuela',
  bancamiga: 'Bancamiga',
  banesco: 'Banesco',
  mercantil: 'Mercantil',
  provincial: 'BBVA Provincial',
  bicentenario: 'Bicentenario',
  tesoro: 'Tesoro',
  caroni: 'Caroní',
  exterior: 'Exterior',
  fondo_comun: 'Fondo Común',
  '100_banco': '100% Banco',
  sofitasa: 'Sofitasa',
  plaza: 'Plaza',
  mi_banco: 'Mi Banco',
  activo: 'Activo',
  del_sur: 'Del Sur',
  bancaribe: 'Bancaribe',
  occidental: 'Occidental',
  agricola: 'Agrícola',
  bancrecer: 'Bancrecer',
  banfanb: 'Banfanb',
};

export const VEPAY_BANKS = Object.entries(BANK_DISPLAY_NAMES).map(([value, label]) => ({ value, label }));

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
  // Use flow field if available
  if (receipt.payment.flow === 'incoming') return 'income';
  if (receipt.payment.flow === 'outgoing') return 'expense';

  // Fallback to concept analysis
  const concept = (receipt.payment.concept || '').toLowerCase();

  if (concept.includes('pago') || concept.includes('transfer') || concept.includes('envio') || concept.includes('compra')) {
    return 'expense';
  }
  if (concept.includes('recibo') || concept.includes('deposito') || concept.includes('abono') || concept.includes('nomina') || concept.includes('salario')) {
    return 'income';
  }
  return 'expense';
}

export function getBankDisplayName(bankApp: string | null): string {
  if (!bankApp) return 'Desconocido';
  return BANK_DISPLAY_NAMES[bankApp] || bankApp;
}

export function mapReceiptToTransaction(receipt: VEPayReceipt, overrides?: { flow?: 'income' | 'expense'; accountId?: string; bank?: string; date?: string }): {
  amount: number;
  type: 'income' | 'expense' | 'saving';
  category: string;
  description: string;
  date: number;
  reference: string;
  bank: string;
  recipientName: string;
  originAccount: string;
  accountId?: string;
} {
  const amount = parseAmount(receipt.payment.amount.value);

  // Use override flow if provided, otherwise detect from receipt
  let type: 'income' | 'expense' | 'saving';
  if (overrides?.flow) {
    type = overrides.flow;
  } else {
    type = detectTransactionType(receipt);
  }

  // Use override bank if provided, otherwise use detected
  const bankKey = overrides?.bank || receipt.payment.bank_app || receipt.recipient.bank || receipt.origin.bank || '';
  const bankDisplay = getBankDisplayName(bankKey);
  const reference = receipt.payment.reference || '';
  const recipientName = receipt.recipient.name || '';
  const originAccount = receipt.origin.account_last_digits || receipt.origin.account || '';

  // Build detailed description
  let description = '';
  const concept = receipt.payment.concept || '';

  if (type === 'expense') {
    // Outgoing payment
    if (recipientName) {
      description = `Pago a ${recipientName}`;
    } else {
      description = `Pago`;
    }

    if (bankDisplay && bankDisplay !== 'Desconocido') {
      description += ` (${bankDisplay})`;
    }

    if (concept) {
      description += ` - ${concept}`;
    }

    if (originAccount) {
      description += ` [Cuenta ***${originAccount}]`;
    }
  } else {
    // Incoming payment
    if (recipientName) {
      description = `Recibido de ${recipientName}`;
    } else {
      description = `Recibido`;
    }

    if (bankDisplay && bankDisplay !== 'Desconocido') {
      description += ` (${bankDisplay})`;
    }

    if (concept) {
      description += ` - ${concept}`;
    }
  }

  // Fallback if description is empty
  if (!description) {
    description = `Pago ${bankDisplay}${reference ? ` (Ref: ${reference})` : ''}`;
  }

  // Determine category
  let category = 'Otro';
  const conceptLower = (receipt.payment.concept || '').toLowerCase();
  if (conceptLower.includes('comida') || conceptLower.includes('restaurante') || conceptLower.includes('mercado') || conceptLower.includes('super')) category = 'Comida';
  else if (conceptLower.includes('transporte') || conceptLower.includes('gasolina') || conceptLower.includes('uber') || conceptLower.includes('taxi')) category = 'Transporte';
  else if (conceptLower.includes('vivienda') || conceptLower.includes('alquiler') || conceptLower.includes('servicio') || conceptLower.includes('luz') || conceptLower.includes('agua') || conceptLower.includes('internet')) category = 'Vivienda';
  else if (conceptLower.includes('salud') || conceptLower.includes('medico') || conceptLower.includes('farmacia') || conceptLower.includes('clinica')) category = 'Salud';
  else if (conceptLower.includes('educacion') || conceptLower.includes('colegio') || conceptLower.includes('curso') || conceptLower.includes('universidad')) category = 'Educación';
  else if (conceptLower.includes('entretenimiento') || conceptLower.includes('cine') || conceptLower.includes('juego') || conceptLower.includes('netflix')) category = 'Entretenimiento';
  else if (conceptLower.includes('nomina') || conceptLower.includes('salario') || conceptLower.includes('sueldo') || conceptLower.includes('pago')) category = 'Salario';
  else if (conceptLower.includes('ahorro') || conceptLower.includes('inversión')) category = 'Ahorro';
  else if (conceptLower.includes('luzmi') || conceptLower.includes('luz') || conceptLower.includes('electricidad')) category = 'Vivienda';
  else if (conceptLower.includes('telefono') || conceptLower.includes('movil') || conceptLower.includes('cantv')) category = 'Vivienda';

  // Date: use override if provided, otherwise parse from receipt
  let date = Date.now();
  if (overrides?.date) {
    const parsed = new Date(overrides.date + 'T12:00:00');
    if (!isNaN(parsed.getTime())) date = parsed.getTime();
  } else if (receipt.payment.date_time.iso) {
    const parsed = new Date(receipt.payment.date_time.iso);
    if (!isNaN(parsed.getTime())) date = parsed.getTime();
  } else if (receipt.payment.date_time.raw) {
    const parsed = new Date(receipt.payment.date_time.raw);
    if (!isNaN(parsed.getTime())) date = parsed.getTime();
  }

  return { amount, type, category, description, date, reference, bank: bankDisplay, recipientName, originAccount, accountId: overrides?.accountId };
}
