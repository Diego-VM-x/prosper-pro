export function parseCSV<T>(csvString: string, headers: string[]): T[] {
  const lines = csvString.trim().split(/\r?\n/);
  const result: T[] = [];

  for (let i = 0; i < lines.length; i++) {
    const values = lines[i].split(";"); // Asume CSV delimitado por punto y coma
    if (values.length !== headers.length) {
      console.warn(`Skipping line ${i + 1} due to column mismatch:`, lines[i]);
      continue;
    }

    const item: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = values[j].trim();
    }
    result.push(item as T);
  }
  return result;
}

export function validateTransactionCSV(data: any[]): boolean {
  if (!data || data.length === 0) return false;
  const requiredHeaders = ["date", "amount", "type", "category", "description"];
  const firstItem = data[0];
  return requiredHeaders.every(header => Object.keys(firstItem).includes(header));
}
