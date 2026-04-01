'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTransactionsByUserId, getMonthlySummary, createTransaction, deleteTransaction } from '@/lib/firestore/transactions';
import type { Transaction } from '@/types';

// Sin datos por defecto

const CATEGORIES = {
  income: ['Salario', 'Freelance', 'Inversiones', 'Negocio', 'Otro'],
  expense: ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Otro'],
  saving: ['Ahorro', 'Inversión', 'Fondo Emergencia', 'Otro'],
};

const TYPE_LABELS: Record<string, string> = { income: 'Ingreso', expense: 'Gasto', saving: 'Ahorro' };
const TYPE_COLORS: Record<string, string> = { income: 'var(--color-prosper-green)', expense: 'var(--color-error)', saving: 'var(--color-pine-500)' };

export default function FinanzasPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, saving: 0, balance: 0 });
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [showModal, setShowModal] = useState(false);
  const [newTx, setNewTx] = useState({ amount: '', type: 'income' as Transaction['type'], category: 'Salario', description: '' });

  useEffect(() => {
    const uid = user?.uid as string;
    if (!uid) return;
    let cancelled = false;
    async function loadData() {
      try {
        const [txs, summary] = await Promise.all([
          getTransactionsByUserId(uid),
          getMonthlySummary(uid),
        ]);
        if (!cancelled) {
          if (txs.length) setTransactions(txs);
          setSummary(summary);
        }
      } catch (e) { console.error(e); }
    }
    loadData();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const categories = filterType === 'Todos' ? Object.values(CATEGORIES).flat() : (CATEGORIES[filterType as keyof typeof CATEGORIES] || []);
  const filteredTx = transactions.filter((t) => {
    if (filterType !== 'Todos' && t.type !== filterType) return false;
    if (filterCategory !== 'Todas' && t.category !== filterCategory) return false;
    return true;
  });

  const handleAddTransaction = async () => {
    if (!newTx.amount || !newTx.description) return;
    const tx: Transaction = {
      id: 't' + Date.now(),
      userId: user?.uid || 'local',
      amount: Number(newTx.amount),
      type: newTx.type,
      category: newTx.category,
      description: newTx.description,
      date: Date.now(),
    };
    setTransactions((prev) => [tx, ...prev]);
    if (user?.uid) {
      try { await createTransaction(tx); } catch (e) { console.error(e); }
    }
    setShowModal(false);
    setNewTx({ amount: '', type: 'income', category: 'Salario', description: '' });
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (user?.uid) {
      try { await deleteTransaction(id); } catch (e) { console.error(e); }
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Finanzas</h1>
            <p className="page-subtitle">Controla tus ingresos, gastos y ahorros.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nueva Transacción</button>
        </div>

        {/* Resumen mensual */}
        <div className="summary-grid">
          <div className="summary-card summary-income">
            <span className="summary-label">Ingresos</span>
            <span className="summary-value">${summary.income.toLocaleString()}</span>
          </div>
          <div className="summary-card summary-expense">
            <span className="summary-label">Gastos</span>
            <span className="summary-value">${summary.expenses.toLocaleString()}</span>
          </div>
          <div className="summary-card summary-saving">
            <span className="summary-label">Ahorro</span>
            <span className="summary-value">${summary.saving.toLocaleString()}</span>
          </div>
          <div className="summary-card summary-balance">
            <span className="summary-label">Balance</span>
            <span className="summary-value">${summary.balance.toLocaleString()}</span>
          </div>
        </div>

        {/* Filtros */}
        <div className="filter-bar">
          {['Todos', 'income', 'expense', 'saving'].map((t) => (
            <button key={t} className={`filter-btn ${filterType === t ? 'active' : ''}`} onClick={() => { setFilterType(t); setFilterCategory('Todas'); }}>
              {t === 'Todos' ? 'Todos' : TYPE_LABELS[t]}
            </button>
          ))}
          <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="Todas">Todas las categorías</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Tabla de transacciones */}
        <div className="transactions-table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length > 0 ? filteredTx.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.description}</td>
                  <td>{tx.category}</td>
                  <td><span className="type-badge" style={{ background: TYPE_COLORS[tx.type] + '20', color: TYPE_COLORS[tx.type] }}>{TYPE_LABELS[tx.type]}</span></td>
                  <td>{formatDate(tx.date)}</td>
                  <td className={`amount-cell ${tx.type === 'income' ? 'amount-income' : tx.type === 'expense' ? 'amount-expense' : 'amount-saving'}`}>
                    {tx.type === 'expense' ? '-' : '+'}${tx.amount.toLocaleString()}
                  </td>
                  <td><button className="delete-btn" onClick={() => handleDeleteTransaction(tx.id)}>✕</button></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="empty-state">No hay transacciones</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Nueva Transacción</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={newTx.type} onChange={(e) => setNewTx({ ...newTx, type: e.target.value as Transaction['type'], category: CATEGORIES[e.target.value as Transaction['type']][0] })}>
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                  <option value="saving">Ahorro</option>
                </select>
                <label className="form-label">Monto ($)</label>
                <input className="form-input" type="number" placeholder="0" value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} />
                <label className="form-label">Categoría</label>
                <select className="form-input" value={newTx.category} onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}>
                  {CATEGORIES[newTx.type].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <label className="form-label">Descripción</label>
                <input className="form-input" type="text" placeholder="Ej: Pago de nómina" value={newTx.description} onChange={(e) => setNewTx({ ...newTx, description: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAddTransaction}>Agregar</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
          .summary-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 4px; }
          .summary-label { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; }
          .summary-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
          .summary-income { border-left: 4px solid var(--color-prosper-green); }
          .summary-expense { border-left: 4px solid var(--color-error); }
          .summary-saving { border-left: 4px solid var(--color-pine-500); }
          .summary-balance { border-left: 4px solid var(--color-gold-500); }
          .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
          .filter-select { padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-primary); font-size: 0.8125rem; }
          .transactions-table-wrapper { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
          .transactions-table { width: 100%; border-collapse: collapse; }
          .transactions-table th { text-align: left; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-input); border-bottom: 1px solid var(--border-default); }
          .transactions-table td { padding: 12px 16px; font-size: 0.8125rem; color: var(--text-primary); border-bottom: 1px solid var(--border-default); }
          .transactions-table tr:last-child td { border-bottom: none; }
          .transactions-table tr:hover { background: var(--bg-input); }
          .type-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 600; }
          .amount-cell { font-weight: 700; }
          .amount-income { color: var(--color-prosper-green); }
          .amount-expense { color: var(--color-error); }
          .amount-saving { color: var(--color-pine-500); }
          .delete-btn { background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 1rem; padding: 4px; border-radius: 50%; }
          .delete-btn:hover { color: var(--color-error); background: rgba(239,68,68,0.1); }
          .empty-state { text-align: center; padding: 32px; color: var(--text-secondary); }
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
          .modal-content { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 90%; max-width: 420px; padding: 24px; }
          .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem; }
          .modal-body { display: flex; flex-direction: column; gap: 14px; }
          .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
          .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: -6px; }
          .form-input { width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.875rem; outline: none; box-sizing: border-box; }
          .form-input:focus { border-color: var(--color-prosper-green); }
          .btn { padding: 10px 20px; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; }
          .btn-primary { background: var(--color-prosper-green); color: white; }
          .btn-outline { background: transparent; border: 1px solid var(--border-default); color: var(--text-primary); }
          .filter-btn { padding: 8px 16px; border-radius: var(--radius-full); background: var(--bg-card); border: 1px solid var(--border-default); color: var(--text-secondary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); white-space: nowrap; }
          .filter-btn.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .filter-btn:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }

          @media (max-width: 768px) {
            .summary-grid { grid-template-columns: repeat(2, 1fr); }
            .filter-bar { flex-direction: column; align-items: stretch; }
            .filter-select { width: 100%; }
            .transactions-table-wrapper { overflow-x: auto; }
            .transactions-table { min-width: 600px; }
          }
          @media (max-width: 480px) {
            .summary-grid { grid-template-columns: 1fr; }
            .page-header { flex-direction: column; }
            .page-header-actions { width: 100%; }
            .page-header-actions .btn { width: 100%; justify-content: center; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
