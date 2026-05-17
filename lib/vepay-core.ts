/**
 * VEPay API Core - Text Parser Only
 * Parses OCR-extracted text into structured Venezuelan mobile payment receipts.
 * OCR is performed client-side with tesseract.js; this module handles parsing only.
 * Based on: https://github.com/jp72924/vepay-api (vepay_api_core.py)
 *
 * Supported banks: Bancamiga, Banesco, BDV, Mercantil Tpago, BBVA Provincial
 */

import type {
  VEPayReceipt,
  VEPayBankApp,
  VEPayStatus,
  VEPayDateTime,
  VEPayValidation,
  VEPayOCR,
  VEPaySource,
} from '@/types';

const SCHEMA_VERSION = 'vepay_api_receipt_v1';
const DEFAULT_LANG = 'spa+eng';

const BDV_RECEIPT_TOKENS = [
  'pagomovilbdv', 'pago movilbdv', 'pagomovil bdv',
  'pago movil bdv', 'bdv personas',
];

const MERCANTIL_RECEIPT_TOKENS = [
  'tu tpago fue exitoso', 'enviar tpago', 'tpago', 'mercantil',
];

const PROVINCIAL_RECEIPT_TOKENS = [
  'dinero rapido', 'bbva provincial',
];

const COUNTERPARTY_BANK_LABELS = [
  'banco receptor', 'banco destino', 'banco',
];

const GENERIC_EXACT_LABELS = new Set([
  'banco', 'beneficiario', 'concepto', 'destino',
  'fecha', 'identificacion', 'monto', 'numero celular',
  'operacion', 'origen',
]);

const LABEL_ALIASES: Record<string, string[]> = {
  reference: [
    'numero de referencia', 'nro. de referencia', 'nro de referencia',
    'referencia', 'operacion',
  ],
  amount: ['monto de la operacion', 'monto (bs.)', 'monto'],
  date: ['fecha y hora del envio', 'fecha'],
  origin_phone: ['numero celular de origen', 'celular de origen'],
  origin_account: ['cuenta origen', 'origen'],
  recipient_phone: [
    'telf beneficiario', 'numero celular de destino',
    'celular de destino', 'numero celular', 'destino',
  ],
  recipient_id: [
    'ci /rif beneficiario', 'cl /rif beneficiario', 'rif beneficiario',
    'identificacion receptor', 'identificacion', 'documento de identidad',
  ],
  origin_bank: ['banco emisor'],
  recipient_bank: ['banco receptor', 'banco destino', 'banco'],
  concept: ['concepto'],
};

const ALL_LABELS_NORMALIZED = new Set(
  Object.values(LABEL_ALIASES).flat().map(norm)
);

const MONEY_RE = /(?<!\d)(?:Bs\.?\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2}|[0-9]+\.[0-9]{2})(?:\s*Bs\.?)?(?!\d)/gi;

function stripAccents(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function norm(value: string): string {
  value = stripAccents(value).toLowerCase();
  value = value.replace(/[^a-z0-9/*:.()# -]+/g, ' ');
  return value.replace(/\s+/g, ' ').trim();
}

function cleanLines(text: string): string[] {
  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map(raw => raw.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0);
}

function hasBdvReceiptSignal(text: string): boolean {
  const ntext = norm(text);
  return BDV_RECEIPT_TOKENS.some(token => ntext.includes(token));
}

function hasAnyToken(text: string, tokens: string[]): boolean {
  const ntext = norm(text);
  return tokens.some(token => ntext.includes(token));
}

function detectBankFromName(value: string | null): VEPayBankApp {
  if (!value) return null;
  const ntext = norm(value);
  if (hasBdvReceiptSignal(value) || ntext.includes('banco de venezuela')) return 'bdv';
  if (ntext.includes('banesco')) return 'banesco';
  if (ntext.includes('bancamiga')) return 'bancamiga';
  if (ntext.includes('tpago') || ntext.includes('mercantil')) return 'mercantil';
  if (ntext.includes('bbva provincial') || (ntext.includes('dinero rapido') && ntext.includes('provincial'))) return 'provincial';
  return null;
}

function lineMatchesLabel(normalizedLine: string, normalizedAlias: string): boolean {
  if (GENERIC_EXACT_LABELS.has(normalizedAlias)) {
    return normalizedLine === normalizedAlias || normalizedLine.startsWith(normalizedAlias + ':');
  }
  return (
    normalizedLine === normalizedAlias ||
    normalizedLine.startsWith(normalizedAlias + ':') ||
    normalizedLine.startsWith(normalizedAlias + ' ')
  );
}

function isLabelHeader(normalizedLine: string): boolean {
  for (const label of ALL_LABELS_NORMALIZED) {
    if (normalizedLine === label || normalizedLine.startsWith(label + ':')) return true;
  }
  return false;
}

function scrubCandidate(value: string): string | null {
  value = value.trim();
  value = value.replace(/^[=:\-.\s]+/, '');
  value = value.replace(/\s+/g, ' ').trim();
  if (!/[A-Za-z0-9]/.test(value)) return null;
  return value;
}

function valueAfterLabel(lines: string[], aliases: string[]): string | null {
  const normalizedAliases = aliases.map(norm);
  const normalizedLines = lines.map(norm);

  for (let idx = 0; idx < normalizedLines.length; idx++) {
    const normalizedLine = normalizedLines[idx];
    const matchingAliases = normalizedAliases.filter(alias =>
      lineMatchesLabel(normalizedLine, alias)
    );
    if (matchingAliases.length === 0) continue;

    const rawLine = lines[idx];
    const candidates: string[] = [];

    if (rawLine.includes(':')) {
      candidates.push(rawLine.split(':', 2)[1].trim());
    }

    for (const alias of matchingAliases) {
      if (!rawLine.includes(':') && !GENERIC_EXACT_LABELS.has(alias)) {
        const tail = normalizedLine.split(alias, 2)[1].replace(/^[ :.\-]+|[ :.\-]+$/g, '');
        if (tail) candidates.push(tail);
      }
    }

    for (let offset = 1; offset <= 3; offset++) {
      const nextIdx = idx + offset;
      if (nextIdx >= lines.length) break;
      const nextNormalized = normalizedLines[nextIdx];
      if (isLabelHeader(nextNormalized)) break;
      candidates.push(lines[nextIdx]);
    }

    for (const candidate of candidates) {
      const scrubbed = scrubCandidate(candidate);
      if (scrubbed) return scrubbed;
    }
  }
  return null;
}

function valueAfterLabelFlexible(lines: string[], aliases: string[]): string | null {
  const normalizedAliases = aliases.map(norm);
  const normalizedLines = lines.map(norm);

  for (let idx = 0; idx < normalizedLines.length; idx++) {
    for (const alias of normalizedAliases) {
      const nLine = normalizedLines[idx];
      if (
        nLine !== alias &&
        !nLine.startsWith(alias + ':') &&
        !nLine.startsWith(alias + ' ')
      ) continue;

      const rawLine = lines[idx];
      const candidates: string[] = [];

      if (rawLine.includes(':')) {
        candidates.push(rawLine.split(':', 2)[1].trim());
      } else if (rawLine.length > alias.length) {
        candidates.push(rawLine.slice(alias.length).trim());
      }

      for (let offset = 1; offset <= 3; offset++) {
        const nextIdx = idx + offset;
        if (nextIdx >= lines.length) break;
        if (isLabelHeader(normalizedLines[nextIdx])) break;
        candidates.push(lines[nextIdx]);
      }

      for (const candidate of candidates) {
        const scrubbed = scrubCandidate(candidate);
        if (scrubbed) return scrubbed;
      }
    }
  }
  return null;
}

function stripCounterpartyBankSections(lines: string[]): string[] {
  const normalizedLabels = COUNTERPARTY_BANK_LABELS.map(norm);
  const normalizedLines = lines.map(norm);
  const kept: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const normalizedLine = normalizedLines[index];
    const isCounterparty = normalizedLabels.some(label =>
      lineMatchesLabel(normalizedLine, label)
    );

    if (isCounterparty) {
      index++;
      while (index < lines.length) {
        if (isLabelHeader(normalizedLines[index])) break;
        index++;
      }
      continue;
    }

    kept.push(lines[index]);
    index++;
  }
  return kept;
}

function detectBankFromReceiptText(text: string): VEPayBankApp {
  const lines = cleanLines(text);
  const appText = stripCounterpartyBankSections(lines).join('\n');

  if (hasBdvReceiptSignal(appText)) return 'bdv';
  if (hasAnyToken(appText, MERCANTIL_RECEIPT_TOKENS)) return 'mercantil';
  if (hasAnyToken(appText, PROVINCIAL_RECEIPT_TOKENS)) return 'provincial';
  return detectBankFromName(appText);
}

function detectBank(text: string): VEPayBankApp {
  const lines = cleanLines(text);
  const originBank = valueAfterLabel(lines, LABEL_ALIASES['origin_bank']);
  const bankFromOrigin = detectBankFromName(originBank);
  if (bankFromOrigin) return bankFromOrigin;
  return detectBankFromReceiptText(text);
}

function detectStatus(text: string): VEPayStatus {
  const ntext = norm(text);
  const successTokens = [
    'transaccion exitosa', 'operacion exitosa', 'fue exitoso',
    'el dinero fue enviado', 'listo',
  ];
  if (successTokens.some(token => ntext.includes(token))) return 'success';
  return null;
}

function extractReference(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\d{8,}/);
  return match ? match[0] : null;
}

function extractAmountFromValue(value: string | null): [string | null, string | null] {
  if (!value) return [null, null];

  MONEY_RE.lastIndex = 0;
  const match = MONEY_RE.exec(value);
  if (!match) return [null, null];

  const raw = match[1];
  let normalized: string;

  if (raw.includes(',')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = raw;
  }

  const decimalValue = parseFloat(normalized);
  if (isNaN(decimalValue)) return [raw, null];

  return [raw, decimalValue.toFixed(2)];
}

function extractAmount(lines: string[], combinedText: string): [string | null, string | null] {
  const labelValue = valueAfterLabel(lines, LABEL_ALIASES['amount']);
  const [raw, normalized] = extractAmountFromValue(labelValue);
  if (normalized) return [raw, normalized];

  for (const line of lines) {
    const [r, n] = extractAmountFromValue(line);
    if (n) return [r, n];
  }

  return extractAmountFromValue(combinedText);
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9*]/g, '');
  return cleaned || null;
}

function normalizeDocumentId(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/([VEJGPCR]-?\s*)?([0-9][0-9.\s-]{4,})/i);
  if (!match) return null;

  const prefix = (match[1] || '').toUpperCase().replace(/[\s-]/g, '');
  const number = match[2].replace(/\D/g, '');
  return prefix ? `${prefix}-${number}` : number;
}

function normalizeBank(value: string | null): string | null {
  if (!value) return null;
  value = value.replace(/\s+/g, ' ').replace(/^[ .]+|[ .]+$/g, '');
  value = value.replace(/S\.a\.c\.a\./gi, 'S.A.C.A.');
  return value ? value.toUpperCase() : null;
}

function normalizeConcept(value: string | null): string | null {
  if (!value) return null;
  value = stripAccents(value).replace(/[^A-Za-z0-9 /._-]/g, '').trim();
  return value ? value.toUpperCase() : null;
}

function parseDateTime(rawValue: string | null): VEPayDateTime {
  if (!rawValue) return { raw: null, iso: null };

  const raw = rawValue.trim();
  let cleaned = stripAccents(raw);
  cleaned = cleaned.replace(/\ba\s+las\b/gi, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  const dateMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!dateMatch) return { raw, iso: null };

  const day = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  let year = parseInt(dateMatch[3], 10);
  if (year < 100) year += 2000;

  const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]\.?M\.?)?/i);

  try {
    if (!timeMatch) {
      const parsedDate = new Date(year, month - 1, day);
      return { raw, iso: parsedDate.toISOString().split('T')[0] };
    }

    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    const second = parseInt(timeMatch[3] || '0', 10);
    const amPm = (timeMatch[4] || '').replace(/\./g, '').toUpperCase();

    if (amPm === 'PM' && hour < 12) hour += 12;
    if (amPm === 'AM' && hour === 12) hour = 0;

    const parsed = new Date(year, month - 1, day, hour, minute, second);
    return { raw, iso: parsed.toISOString().replace(/\.\d{3}Z$/, '') };
  } catch {
    return { raw, iso: null };
  }
}

function computeTransactionKey(receipt: VEPayReceipt): string | null {
  const parts = [
    receipt.payment.bank_app || '',
    receipt.payment.reference || '',
    receipt.payment.amount.value || '',
    receipt.payment.date_time.iso || receipt.payment.date_time.raw || '',
    receipt.recipient.phone || receipt.recipient.document_id || '',
  ];
  if (!parts.slice(1).some(p => p)) return null;

  const combined = parts.join('|');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function getNested(data: Record<string, unknown>, dottedPath: string): unknown {
  let current: unknown = data;
  for (const part of dottedPath.split('.')) {
    if (typeof current !== 'object' || current === null) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

const REQUIRED_EXTRACTION_FIELDS = [
  'payment.reference', 'payment.amount.value',
  'payment.date_time.raw', 'recipient.bank', 'payment.concept',
];

function missingFields(receipt: VEPayReceipt): string[] {
  const missing: string[] = [];
  for (const path of REQUIRED_EXTRACTION_FIELDS) {
    const value = getNested(receipt as unknown as Record<string, unknown>, path);
    if (value === null || value === undefined || value === '') {
      missing.push(path);
    }
  }
  return missing;
}

function emptyReceipt(): VEPayReceipt {
  return {
    schema_version: SCHEMA_VERSION,
    source: { file_name: '', file_path: '', sha256: '' },
    payment: {
      bank_app: null, status: null, reference: null,
      amount: { value: null, currency: 'VES', raw: null },
      date_time: { raw: null, iso: null }, concept: null,
    },
    origin: { phone: null, account: null, bank: null },
    recipient: { phone: null, document_id: null, bank: null },
    ocr: { engine: 'tesseract', language: DEFAULT_LANG, passes: ['full_psm_6'] },
    transaction_key: null,
    validation: { is_complete: false, missing_fields: [], warnings: [] },
  };
}

export function parseOcrText(
  ocrText: string,
  filename: string,
  options: { lang?: string; includeRawText?: boolean } = {}
): VEPayReceipt {
  const {
    lang = DEFAULT_LANG,
    includeRawText = true,
  } = options;

  const lines = cleanLines(ocrText);
  const bankApp = detectBank(ocrText);

  const reference = extractReference(valueAfterLabel(lines, LABEL_ALIASES['reference']));
  const [amountRaw, amountValue] = extractAmount(lines, ocrText);
  const dateTime = parseDateTime(valueAfterLabel(lines, LABEL_ALIASES['date']));

  const originPhone = normalizePhone(valueAfterLabel(lines, LABEL_ALIASES['origin_phone']));
  const originAccount = valueAfterLabel(lines, LABEL_ALIASES['origin_account']);
  const recipientPhone = normalizePhone(valueAfterLabel(lines, LABEL_ALIASES['recipient_phone']));
  const recipientId = normalizeDocumentId(valueAfterLabel(lines, LABEL_ALIASES['recipient_id']));
  const originBank = normalizeBank(valueAfterLabel(lines, LABEL_ALIASES['origin_bank']));
  const recipientBank = normalizeBank(valueAfterLabel(lines, LABEL_ALIASES['recipient_bank']));

  const finalBankApp = detectBankFromName(originBank) || bankApp;
  const concept = normalizeConcept(valueAfterLabel(lines, LABEL_ALIASES['concept']));

  let finalRecipientPhone = recipientPhone;
  let finalOriginPhone = originPhone;
  let finalOriginAccount = originAccount;
  let finalReference = reference;
  let finalDateTime = dateTime;
  let finalRecipientId = recipientId;
  let finalRecipientBank = recipientBank;
  let finalConcept = concept;

  if (finalBankApp === 'banesco') {
    finalRecipientPhone = normalizePhone(
      valueAfterLabel(lines, ['numero celular de destino', 'celular de destino'])
    );
  }

  if (finalBankApp === 'mercantil') {
    finalOriginPhone = null;
    finalRecipientPhone = normalizePhone(valueAfterLabel(lines, ['beneficiario']));
    if (finalOriginAccount) {
      finalOriginAccount = finalOriginAccount.trim();
    }
  }

  if (finalBankApp === 'provincial') {
    finalReference = extractReference(
      valueAfterLabelFlexible(lines, ['referencia'])
    ) || finalReference;

    const provincialDate = parseDateTime(valueAfterLabelFlexible(lines, ['fecha']));
    if (provincialDate.raw) finalDateTime = provincialDate;

    finalRecipientPhone = normalizePhone(
      valueAfterLabelFlexible(lines, ['numero celular'])
    ) || finalRecipientPhone;

    finalRecipientId = normalizeDocumentId(
      valueAfterLabelFlexible(lines, ['identificacion'])
    ) || finalRecipientId;

    finalRecipientBank = normalizeBank(
      valueAfterLabelFlexible(lines, ['banco'])
    ) || finalRecipientBank;

    finalConcept = normalizeConcept(
      valueAfterLabelFlexible(lines, ['concepto'])
    ) || finalConcept;
  }

  const receipt: VEPayReceipt = {
    schema_version: SCHEMA_VERSION,
    source: {
      file_name: filename,
      file_path: `upload://${filename}`,
      sha256: '',
    },
    payment: {
      bank_app: finalBankApp,
      status: detectStatus(ocrText),
      reference: finalReference,
      amount: {
        value: amountValue,
        currency: 'VES',
        raw: amountRaw,
      },
      date_time: finalDateTime,
      concept: finalConcept,
    },
    origin: {
      phone: finalOriginPhone,
      account: finalOriginAccount,
      bank: originBank,
    },
    recipient: {
      phone: finalRecipientPhone,
      document_id: finalRecipientId,
      bank: finalRecipientBank,
    },
    ocr: {
      engine: 'tesseract',
      language: lang,
      passes: ['full_psm_6'],
    },
    validation: {
      is_complete: false,
      missing_fields: [],
      warnings: [],
    },
    transaction_key: null,
  };

  if (includeRawText) {
    receipt.ocr.raw_text = ocrText;
  }

  receipt.transaction_key = computeTransactionKey(receipt);

  const missing = missingFields(receipt);
  receipt.validation.missing_fields = missing;
  receipt.validation.is_complete = missing.length === 0;

  if (finalBankApp === null) {
    receipt.validation.warnings.push('No se pudo detectar el banco/app.');
  }
  if (finalBankApp === 'bdv' && !amountValue) {
    receipt.validation.warnings.push(
      'No se pudo leer el monto BDV; intenta con una captura mas clara.'
    );
  }
  if (finalBankApp === 'provincial' &&
    (missing.includes('payment.reference') || missing.includes('recipient.bank'))) {
    receipt.validation.warnings.push(
      'Provincial alternate layout does not expose all confirmation fields; manual review required.'
    );
  }

  return receipt;
}

export function parseMultipleOcrTexts(
  texts: Array<{ text: string; filename: string }>,
  options: { lang?: string; includeRawText?: boolean } = {}
): {
  receipts: VEPayReceipt[];
  errors: Array<{ filename: string; code: string; message: string }>;
} {
  const receipts: VEPayReceipt[] = [];
  const errors: Array<{ filename: string; code: string; message: string }> = [];

  for (const item of texts) {
    try {
      const receipt = parseOcrText(item.text, item.filename, options);
      receipts.push(receipt);
    } catch (err: unknown) {
      errors.push({
        filename: item.filename,
        code: 'parse_failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { receipts, errors };
}
