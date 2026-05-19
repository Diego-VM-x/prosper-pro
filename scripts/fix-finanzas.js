const fs = require('fs');

const file = 'c:/Users/Norelys/Desktop/Prosper-Pro/app/finanzas/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  /import \{ useAuth \} from '@\/lib\/contexts\/AuthContext';/,
  "import { useAuth } from '@/lib/contexts/AuthContext';\nimport { useCurrency } from '@/lib/contexts/CurrencyContext';"
);

// Add hook
content = content.replace(
  /const \{ success, error, warning \} = useToast\(\);/,
  "const { success, error, warning } = useToast();\n  const { formatAmount, currencyMap, displayCurrency } = useCurrency();"
);

// Replace generic pattern $${X.toLocaleString()} -> ${formatAmount(X)}
content = content.replace(/\$\$\{([a-zA-Z0-9_?.()]+)\.toLocaleString\(\)\}/g, '${formatAmount($1)}');

// Replace complex property paths like $${acc.balance.toLocaleString()}
content = content.replace(/\$\$\{([a-zA-Z0-9_?.()]+\.[a-zA-Z0-9_?.()]+)\.toLocaleString\(\)\}/g, '${formatAmount($1)}');

// Replace Math.abs case
content = content.replace(/\$\$\{Math\.abs\(([a-zA-Z0-9_?.()]+)\)\.toLocaleString\(\)\}/g, '${formatAmount(Math.abs($1))}');

// Replace specific options case
content = content.replace(/\$\{tx\.amount\.toLocaleString\('es', \{ minimumFractionDigits: 2 \}\)\}/g, '${formatAmount(tx.amount)}');

// Replace specific span hardcoded $
content = content.replace(/<span className="tx-currency">\$<\/span>/g, '<span className="tx-currency">{currencyMap[displayCurrency].symbol}</span>');

fs.writeFileSync(file, content, 'utf8');
console.log('Done replacing finanzas.');
