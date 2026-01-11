
import React, { useRef, useState } from 'react';
import { FinanceEntry, EntryType, FinancialCategory } from '../types';

interface CsvImporterProps {
  onImport: (entries: FinanceEntry[]) => void;
  baseCurrency: string;
}

const CsvImporter: React.FC<CsvImporterProps> = ({ onImport, baseCurrency }) => {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): any[] => {
    const lines = text.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',');
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i]?.trim();
      });
      return obj;
    });
  };

  const mapToEntry = (raw: any): FinanceEntry | null => {
    // HSBC Format: Date, Type, Description, Value, Balance
    // Monzo Format: Transaction ID, Date, Time, Type, Name, Emoji, Category, Amount, Currency...
    
    const name = raw.name || raw.description || raw.merchant || 'Unknown Merchant';
    const amountStr = raw.amount || raw.value || raw['amount (gbp)'] || '0';
    const amount = Math.abs(parseFloat(amountStr));
    const isCredit = parseFloat(amountStr) > 0;
    const date = raw.date ? new Date(raw.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    // Simple heuristic for category mapping
    let category: FinancialCategory = 'Wants';
    const lowName = name.toLowerCase();
    if (isCredit) category = 'Income';
    else if (lowName.includes('rent') || lowName.includes('council') || lowName.includes('utility') || lowName.includes('ee') || lowName.includes('tesco') || lowName.includes('lidl') || lowName.includes('insurance')) category = 'Needs';
    else if (lowName.includes('savings') || lowName.includes('isa') || lowName.includes('vanguard')) category = 'Savings';
    else if (lowName.includes('loan') || lowName.includes('mortgage') || lowName.includes('credit card')) category = 'Debt';

    return {
      id: crypto.randomUUID(),
      name,
      amount,
      currency: raw.currency || baseCurrency,
      date,
      type: isCredit ? EntryType.ASSET : EntryType.EXPENSE,
      category,
      liquidity: 'high'
    };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rawData = parseCSV(text);
      const entries = rawData.map(mapToEntry).filter(Boolean) as FinanceEntry[];
      onImport(entries);
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between gap-4">
      <div className="space-y-1">
        <h4 className="text-sm font-black text-slate-900 tracking-tight">Bulk Import</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HSBC, Monzo, or Custom CSV</p>
      </div>
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="px-6 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2"
      >
        {isImporting ? 'Processing...' : 'Upload CSV'}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
      </button>
    </div>
  );
};

export default CsvImporter;
