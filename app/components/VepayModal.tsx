'use client';

import React, { useState } from 'react';
import { InlineIcon } from '@/app/components/IconMap';
import { CustomSelect } from '@/app/components/CustomSelect';
import { mapReceiptToTransaction, VEPayReceipt, VEPAY_BANKS } from '@/lib/vepay-data';
import { createTransaction } from '@/lib/firestore/transactions';
import { updateAccountBalance } from '@/lib/firestore/accounts';
import type { FinancialAccount, CurrencyCode } from '@/types';

interface VepayModalProps {
  uid: string | undefined;
  accounts: FinancialAccount[];
  onTransactionCreated: () => void | Promise<void>;
  onClose: () => void;
  open: boolean;
  todayISO: () => string;
  formatAmount: (amount: number) => string;
  convertBetween: (amount: number, from: CurrencyCode, to: CurrencyCode) => number;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  txLoading: boolean;
  setTxLoading: (loading: boolean) => void;
  formatInCurrency: (amount: number, code: CurrencyCode) => string;
}

export function VepayModal({
  uid,
  accounts,
  onTransactionCreated,
  onClose,
  open,
  todayISO,
  formatAmount,
  convertBetween,
  success,
  warning,
  error,
  txLoading,
  setTxLoading,
  formatInCurrency,
}: VepayModalProps) {
  const [vepayProcessing, setVepayProcessing] = useState(false);
  const [vepayReceipts, setVepayReceipts] = useState<VEPayReceipt[]>([]);
  const [vepayPreview, setVepayPreview] = useState<string>('');
  const [vepayOverrides, setVepayOverrides] = useState<Record<string, { flow: 'income' | 'expense'; accountId: string; bank: string; date: string }>>({});
  const [vepayManualText, setVepayManualText] = useState('');
  const [vepayManualProcessing, setVepayManualProcessing] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setVepayReceipts([]);
    setVepayPreview('');
    onClose();
  };

  const handleVepayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    setVepayProcessing(true);
    setVepayReceipts([]);
    setVepayOverrides({});

    try {
      const previewUrl = URL.createObjectURL(file);
      setVepayPreview(previewUrl);

      const { parseReceipt } = await import('@/lib/vepay');
      const result = await parseReceipt(file);

      if (result.receipts && result.receipts.length > 0) {
        setVepayReceipts(result.receipts);
        // Initialize overrides with detected dates
        const initialOverrides: Record<string, { flow: 'income' | 'expense'; accountId: string; bank: string; date: string }> = {};
        result.receipts.forEach(r => {
          const key = r.transaction_key || '';
          let dateStr = todayISO();
          if (r.payment.date_time.iso) {
            dateStr = r.payment.date_time.iso.split('T')[0];
          }
          initialOverrides[key] = { flow: 'expense', accountId: '', bank: '', date: dateStr };
        });
        setVepayOverrides(initialOverrides);
        success(`${result.receipts.length} recibo(s) detectado(s)`);
      } else {
        warning('No se pudo detectar un recibo en la captura.');
      }

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => {
          error(`Error: ${err.message}`);
        });
      }
    } catch (err: any) {
      console.error(err);
      error(err?.message || 'Error al procesar la captura');
    } finally {
      setVepayProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleVepayManualParse = async () => {
    if (!vepayManualText.trim() || !uid) return;
    setVepayManualProcessing(true);
    try {
      const { parseMultipleOcrTexts } = await import('@/lib/vepay-core');
      const result = parseMultipleOcrTexts(
        [{ text: vepayManualText, filename: 'manual.txt' }],
        { includeRawText: false }
      );
      if (result.receipts && result.receipts.length > 0) {
        setVepayReceipts(result.receipts);
        const initialOverrides: Record<string, { flow: 'income' | 'expense'; accountId: string; bank: string; date: string }> = {};
        result.receipts.forEach(r => {
          const key = r.transaction_key || '';
          let dateStr = todayISO();
          if (r.payment.date_time.iso) dateStr = r.payment.date_time.iso.split('T')[0];
          initialOverrides[key] = { flow: 'expense', accountId: '', bank: '', date: dateStr };
        });
        setVepayOverrides(initialOverrides);
        success(`${result.receipts.length} recibo(s) detectado(s)`);
      } else {
        warning('No se pudo detectar un recibo en el texto.');
      }
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => error(`Error: ${err.message}`));
      }
    } catch (err: any) {
      error(err?.message || 'Error al analizar el texto');
    }
    setVepayManualProcessing(false);
  };

  const handleVepayConfirm = async (receipt: VEPayReceipt) => {
    if (!uid) return;
    setTxLoading(true);

    try {
      const key = receipt.transaction_key || '';
      const override = vepayOverrides[key];
      const tx = mapReceiptToTransaction(receipt, override);

      const account = accounts.find(a => a.id === tx.accountId);
      const accCurrency = account?.currency || 'USD';

      let finalAmount = tx.amount;
      if (accCurrency === 'USD') {
        finalAmount = Number(convertBetween(tx.amount, 'BS', 'USD').toFixed(2));
      }

      const txData: any = {
        ownerId: uid,
        amount: finalAmount,
        type: tx.type,
        category: tx.category,
        description: accCurrency === 'USD'
          ? `${tx.description} (Original: Bs. ${tx.amount.toLocaleString('es')})`
          : tx.description,
        date: tx.date,
      };
      if (tx.accountId) {
        txData.accountId = tx.accountId;
      }

      await createTransaction(txData);

      if (tx.accountId) {
        const delta = tx.type === 'income' ? finalAmount : -finalAmount;
        await updateAccountBalance(tx.accountId, delta);
      }

      await onTransactionCreated();

      const typeLabel = tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Ahorro';
      success(`${typeLabel} de ${formatInCurrency(finalAmount, accCurrency)} registrado desde captura`);

      setVepayReceipts(prev => prev.filter(r => r.transaction_key !== receipt.transaction_key));
      if (vepayReceipts.length <= 1) {
        setVepayReceipts([]);
        setVepayPreview('');
        setVepayOverrides({});
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      error(`Error al registrar: ${err?.message || 'Error desconocido'}`);
    } finally {
      setTxLoading(false);
    }
  };

  const handleVepaySkip = (receipt: VEPayReceipt) => {
    setVepayReceipts(prev => prev.filter(r => r.transaction_key !== receipt.transaction_key));
    if (vepayReceipts.length <= 1) {
      setVepayReceipts([]);
      setVepayPreview('');
      onClose();
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-content modal-vepay" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2 className="modal-title">Importar desde Captura</h2>
              <p className="modal-subtitle">Sube un recibo de pago móvil (Bancamiga, Banesco, BDV, Mercantil, Provincial)</p>
            </div>
            <button className="modal-close" onClick={handleClose}><InlineIcon icon="X" size={18} /></button>
          </div>

          {/* Upload area (desktop only) */}
          <div className="vepay-upload-area">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 8 }}>
              Opción 1: Subir captura (solo funciona en escritorio)
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleVepayUpload}
              id="vepay-file-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="vepay-file-input" className="vepay-upload-label">
              {vepayProcessing ? (
                <div className="vepay-uploading">
                  <span className="spinner vepay-spinner" />
                  <span>Procesando captura con OCR...</span>
                </div>
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Seleccionar captura de recibo</span>
                </>
              )}
            </label>
          </div>

          {/* Preview */}
          {vepayPreview && (
            <div className="vepay-preview">
              <img src={vepayPreview} alt="Captura" loading="lazy" />
            </div>
          )}

          {/* Manual text input */}
          <div className="vepay-manual-area" style={{ padding: '0 4px', marginTop: 4 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 6 }}>
              Opción 2: Pegar el texto del recibo manualmente
            </div>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Pega aquí el texto del recibo (pago móvil, transferencia)..."
                value={vepayManualText}
                onChange={(e) => setVepayManualText(e.target.value)}
                style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleVepayManualParse}
                disabled={vepayManualProcessing || !vepayManualText.trim()}
                style={{ marginTop: 8, width: '100%' }}
              >
                {vepayManualProcessing ? 'Analizando...' : 'Analizar texto'}
              </button>
            </div>

          {/* Receipts detected */}
          {vepayReceipts.length > 0 && (
            <div className="vepay-receipts">
              <h2 className="vepay-receipts-title">Recibos detectados ({vepayReceipts.length})</h2>
              {vepayReceipts.map((receipt, idx) => {
                const key = receipt.transaction_key || String(idx);
                const override = vepayOverrides[key] || { flow: 'expense', accountId: '', bank: '', date: todayISO() };
                const tx = mapReceiptToTransaction(receipt, override);
                const typeColor = tx.type === 'income' ? 'var(--color-prosper-green)' : tx.type === 'expense' ? 'var(--color-error)' : 'var(--color-pine-500)';
                const typeLabel = tx.type === 'income' ? 'Entrada' : tx.type === 'expense' ? 'Salida' : 'Ahorro';
                const flowIcon = tx.type === 'income' ? '↓' : '↑';

                const updateOverride = (updates: Partial<typeof override>) => {
                  setVepayOverrides(prev => ({
                    ...prev,
                    [key]: { ...override, ...updates },
                  }));
                };

                return (
                  <div key={key} className="vepay-receipt-card">
                    {/* Flow selector */}
                    <div className="vepay-flow-selector">
                      <button
                        className={`vepay-flow-btn ${override.flow === 'expense' ? 'active-out' : ''}`}
                        onClick={() => updateOverride({ flow: 'expense' })}
                      >
                        ↑ Salida
                      </button>
                      <button
                        className={`vepay-flow-btn ${override.flow === 'income' ? 'active-in' : ''}`}
                        onClick={() => updateOverride({ flow: 'income' })}
                      >
                        ↓ Entrada
                      </button>
                    </div>

                    {/* Account selector */}
                    <div className="vepay-field">
                      <label className="vepay-field-label">Cuenta Prosper</label>
                       <CustomSelect
                         value={override.accountId}
                         onChange={(val) => updateOverride({ accountId: val })}
                         options={[
                           { value: '', label: 'Seleccionar cuenta...' },
                           ...accounts.map(acc => ({ value: acc.id, label: `${acc.name} ($${acc.balance.toLocaleString()})`, icon: acc.icon })),
                         ]}
                         placeholder="Seleccionar cuenta..."
                       />
                    </div>

                    {/* Bank selector */}
                    <div className="vepay-field">
                      <label className="vepay-field-label">Banco del pago</label>
                      <CustomSelect
                        value={override.bank || tx.bank}
                        onChange={(val) => updateOverride({ bank: val })}
                        options={[
                          { value: '', label: 'Detectado automáticamente' },
                          ...VEPAY_BANKS.map(b => ({ value: b.value, label: b.label })),
                        ]}
                        placeholder="Seleccionar banco..."
                      />
                    </div>

                    {/* Date selector */}
                    <div className="vepay-field">
                      <label className="vepay-field-label">Fecha de transacción</label>
                      <input
                        className="vepay-select vepay-date-input"
                        type="date"
                        value={override.date}
                        onChange={(e) => updateOverride({ date: e.target.value })}
                      />
                    </div>

                    <div className="vepay-receipt-header">
                      <span className="vepay-bank-badge">{tx.bank}</span>
                      <span className="vepay-type-badge" style={{ background: typeColor + '20', color: typeColor }}>{flowIcon} {typeLabel}</span>
                    </div>
                    <div className="vepay-receipt-amount" style={{ color: typeColor }}>
                      {tx.type === 'expense' ? '-' : '+'}${formatAmount(tx.amount)}
                    </div>
                    <p className="vepay-receipt-concept">{tx.description}</p>
                    <div className="vepay-receipt-details">
                      {receipt.recipient.name && (
                        <div className="vepay-detail-row">
                          <span className="vepay-detail-label">Beneficiario:</span>
                          <span className="vepay-detail-value">{receipt.recipient.name}</span>
                        </div>
                      )}
                      {receipt.origin.account_last_digits && (
                        <div className="vepay-detail-row">
                          <span className="vepay-detail-label">Cuenta origen:</span>
                          <span className="vepay-detail-value">****{receipt.origin.account_last_digits}</span>
                        </div>
                      )}
                      {receipt.recipient.document_id && (
                        <div className="vepay-detail-row">
                          <span className="vepay-detail-label">CI/RIF:</span>
                          <span className="vepay-detail-value">{receipt.recipient.document_id}</span>
                        </div>
                      )}
                    </div>
                    <div className="vepay-receipt-meta">
                      {receipt.payment.reference && <span>Ref: {receipt.payment.reference}</span>}
                      {receipt.payment.date_time.raw && <span>{receipt.payment.date_time.raw}</span>}
                    </div>
                    {!receipt.validation.is_complete && receipt.validation.missing_fields.length > 0 && (
                      <p className="vepay-receipt-warning"><InlineIcon icon="AlertTriangle" size={14} /> Campos incompletos: {receipt.validation.missing_fields.join(', ')}</p>
                    )}
                    <div className="vepay-receipt-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => handleVepaySkip(receipt)}>Omitir</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleVepayConfirm(receipt)} disabled={txLoading || !override.accountId}>
                        {txLoading ? <span className="btn-loading"><span className="spinner" /> Guardando...</span> : 'Registrar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .modal-vepay { max-width: 520px; }
        .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .modal-close:hover { background: var(--bg-input); }
        .vepay-upload-area {
          border: 2px dashed var(--border-default);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          transition: border-color 0.2s;
          margin-bottom: 16px;
        }
        .vepay-upload-area:hover { border-color: var(--color-prosper-green); }
        .vepay-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .vepay-upload-label svg { color: var(--text-tertiary); }
        .vepay-uploading { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--color-prosper-green); }
        .vepay-spinner { width: 24px; height: 24px; border-width: 3px; border-color: rgba(61,204,142,0.2); border-top-color: var(--color-prosper-green); }
        .vepay-preview { margin-bottom: 16px; border-radius: 8px; overflow: hidden; max-height: 200px; }
        .vepay-preview img { width: 100%; height: 100%; object-fit: contain; display: block; }
        .vepay-receipts { display: flex; flex-direction: column; gap: 12px; }
        .vepay-receipts-title { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
        .vepay-receipt-card {
          background: var(--bg-input);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          padding: 14px;
        }
        .vepay-receipt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .vepay-bank-badge {
          padding: 3px 10px;
          border-radius: 6px;
          background: var(--bg-card);
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-primary);
          text-transform: capitalize;
        }
        .vepay-type-badge { padding: 3px 8px; border-radius: 6px; font-size: 0.625rem; font-weight: 700; }
        .vepay-receipt-amount { font-size: 1.375rem; font-weight: 800; margin-bottom: 6px; }
        .vepay-receipt-concept { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 8px 0; line-height: 1.4; }
        .vepay-receipt-meta { display: flex; gap: 12px; font-size: 0.625rem; color: var(--text-tertiary); margin-bottom: 8px; }
        .vepay-receipt-warning { font-size: 0.6875rem; color: var(--color-gold-500); margin: 0 0 8px 0; }
        .vepay-receipt-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .vepay-receipt-details { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; padding: 8px 10px; background: var(--bg-card); border-radius: 8px; }
        .vepay-detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.6875rem; }
        .vepay-detail-label { color: var(--text-tertiary); font-weight: 600; }
        .vepay-detail-value { color: var(--text-primary); font-weight: 700; }
        .vepay-flow-selector { display: flex; gap: 8px; margin-bottom: 12px; }
        .vepay-flow-btn {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: 2px solid var(--border-default);
          background: var(--bg-input);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .vepay-flow-btn:hover { border-color: var(--color-prosper-green); }
        .vepay-flow-btn.active-out { border-color: var(--color-error); background: rgba(239,68,68,0.1); color: var(--color-error); }
        .vepay-flow-btn.active-in { border-color: var(--color-prosper-green); background: rgba(61,204,142,0.1); color: var(--color-prosper-green); }
        .vepay-field { margin-bottom: 10px; }
        .vepay-field-label { display: block; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); margin-bottom: 4px; }
        .vepay-select {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-default);
          background: var(--bg-input);
          color: var(--text-primary);
          font-size: 0.8125rem;
          outline: none;
          cursor: pointer;
        }
        .vepay-select:focus { border-color: var(--color-prosper-green); }
        .vepay-date-input { cursor: pointer; }

        @media (max-width: 768px) {
          .modal-vepay { max-width: none; }
          .vepay-upload-area { padding: 20px 16px; }
          .vepay-receipt-card { padding: 12px; }
        }
        @media (max-width: 480px) {
          .vepay-flow-selector { gap: 6px; }
          .vepay-flow-btn { padding: 8px; font-size: 0.75rem; }
          .vepay-receipt-amount { font-size: 1.25rem; }
          .vepay-receipt-actions { flex-direction: column; }
          .vepay-receipt-actions .btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </>
  );
}
