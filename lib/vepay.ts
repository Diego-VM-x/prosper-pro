/**
 * VEPay API Client
 * Extracts structured payment data from Venezuelan mobile banking receipt screenshots.
 * API: https://github.com/jp72924/vepay-api
 */

const API_URL = process.env.NEXT_PUBLIC_VEPAY_API_URL || 'http://127.0.0.1:8080';

export interface VEPayAmount {
  value: string;
  currency: string;
}

export interface VEPayDateTime {
  raw: string;
}

export interface VEPayPayment {
  bank_app: string;
  status: string;
  reference: string;
  amount: VEPayAmount;
  date_time: VEPayDateTime;
  concept: string;
}

export interface VEPayRecipient {
  phone?: string;
  document_id?: string;
  bank?: string;
}

export interface VEPayOrigin {
  phone?: string;
  account?: string;
  bank?: string;
}

export interface VEPayValidation {
  complete: boolean;
  missing_fields: string[];
  warnings: string[];
}

export interface VEPayReceipt {
  payment: VEPayPayment;
  origin: VEPayOrigin;
  recipient: VEPayRecipient;
  validation: VEPayValidation;
  transaction_key: string;
}

export interface VEPayResponse {
  request_id: string;
  schema_version: string;
  receipts: VEPayReceipt[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  errors: Array<{ filename: string; error: string }>;
}

export async function parseReceipt(file: File): Promise<VEPayResponse> {
  const form = new FormData();
  form.append('files', file, file.name);
  form.append('include_raw_text', 'false');
  form.append('enable_crops', 'true');

  const response = await fetch('/api/vepay/parse', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error al procesar captura: ${text}`);
  }

  return response.json();
}

export function parseAmount(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function detectTransactionType(receipt: VEPayReceipt): 'income' | 'expense' | 'saving' {
  const concept = (receipt.payment.concept || '').toLowerCase();
  const bankApp = (receipt.payment.bank_app || '').toLowerCase();

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
  if (receipt.payment.date_time.raw) {
    const parsed = new Date(receipt.payment.date_time.raw);
    if (!isNaN(parsed.getTime())) date = parsed.getTime();
  }

  return { amount, type, category, description, date, reference, bank };
}
