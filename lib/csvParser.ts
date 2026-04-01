import type { Transaction } from '@/types';
import { createTransaction } from './firestore/transactions';

// Parsear CSV con delimitador configurable
export function parseCSV<T>(csvString: string, delimiter: string = ';'): T[] {
  const lines = csvString.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Primera línea = headers
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  const result: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    if (values.length !== headers.length) {
      console.warn(`Línea ${i + 1} saltada por columnas incorrectas`);
      continue;
    }

    const item: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = values[j].trim();
    }
    result.push(item as unknown as T);
  }
  return result;
}

// Validar que el CSV tenga los headers necesarios
export function validateTransactionCSV(data: Record<string, string>[]): boolean {
  if (!data || data.length === 0) return false;
  const requiredHeaders = ['date', 'amount', 'type', 'category', 'description'];
  const firstItem = data[0];
  return requiredHeaders.every(header => Object.keys(firstItem).includes(header));
}

// Parsear y validar transacciones
export function parseTransactions(csvString: string, delimiter: string = ';'): Record<string, string>[] {
  return parseCSV<Record<string, string>>(csvString, delimiter);
}

// Importar transacciones desde CSV a Firestore
export async function importTransactionsFromCSV(
  csvString: string,
  userId: string,
  delimiter: string = ';'
): Promise<{ success: number; errors: string[] }> {
  const result = { success: 0, errors: [] as string[] };

  try {
    const data = parseTransactions(csvString, delimiter);

    if (!validateTransactionCSV(data)) {
      result.errors.push('Formato inválido. Headers requeridos: date, amount, type, category, description');
      return result;
    }

    const validTypes = ['income', 'expense', 'saving'];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const amount = parseFloat(row.amount);
        if (isNaN(amount) || amount <= 0) {
          result.errors.push(`Fila ${i + 1}: Monto inválido "${row.amount}"`);
          continue;
        }

        if (!validTypes.includes(row.type)) {
          result.errors.push(`Fila ${i + 1}: Tipo inválido "${row.type}". Debe ser: income, expense, saving`);
          continue;
        }

        // Parsear fecha (acepta YYYY-MM-DD o timestamp)
        let date: number;
        if (/^\d+$/.test(row.date)) {
          date = parseInt(row.date);
        } else {
          date = new Date(row.date).getTime();
          if (isNaN(date)) {
            result.errors.push(`Fila ${i + 1}: Fecha inválida "${row.date}"`);
            continue;
          }
        }

        const transaction: Omit<Transaction, 'id'> = {
          userId,
          amount,
          type: row.type as Transaction['type'],
          category: row.category || 'Otro',
          description: row.description || '',
          date,
        };

        await createTransaction(transaction);
        result.success++;
      } catch (err) {
        result.errors.push(`Fila ${i + 1}: Error al procesar - ${(err as Error).message}`);
      }
    }
  } catch (err) {
    result.errors.push(`Error general: ${(err as Error).message}`);
  }

  return result;
}
