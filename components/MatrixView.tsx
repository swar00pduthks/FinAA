
import React, { useMemo, useState } from 'react';
import { UserData, EntryType, FinanceEntry, FinancialCategory } from '../types';

interface MatrixViewProps {
  data: UserData;
  onUpdateEntry: (e: FinanceEntry) => void;
}

const CATEGORIES: FinancialCategory[] = ['Income', 'Needs', 'Wants', 'Debt', 'Savings', 'Investments', 'General'];

const MatrixView: React.FC<MatrixViewProps> = ({ data, onUpdateEntry }) => {
  const { assets, debts } = useMemo(() => {
    return {
      assets: data.entries.filter(e => e.type === EntryType.ASSET),
      debts: data.entries.filter(e => e.type === EntryType.LIABILITY)
    };
  }, [data]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
      <header className="space-y-1 pt-4">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Account Matrix</h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Global Ledger Normalized to {data.settings.currency}
        </p>
      </header>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600">Holding Engines (Assets)</h3>
          <span className="text-[10px] font-bold text-slate-400">{assets.length} Accounts</span>
        </div>
        <div className="space-y-4">
          {assets.map(asset => (
            <MatrixItem key={asset.id} item={asset} type="asset" baseCurrency={data.settings.currency} rates={data.exchangeRates} onUpdate={onUpdateEntry} />
          ))}
          {assets.length === 0 && <EmptyState label="No assets archived yet." />}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">Capital Anchors (Debts)</h3>
          <span className="text-[10px] font-bold text-slate-400">{debts.length} Loans</span>
        </div>
        <div className="space-y-4">
          {debts.map(debt => {
            const linked = assets.find(a => a.id === debt.linkedAssetId);
            return <MatrixItem key={debt.id} item={debt} type="debt" linkedTo={linked} baseCurrency={data.settings.currency} rates={data.exchangeRates} onUpdate={onUpdateEntry} />;
          })}
          {debts.length === 0 && <EmptyState label="Zero debt detected. Excellent velocity." />}
        </div>
      </section>
    </div>
  );
};

const MatrixItem: React.FC<{ item: FinanceEntry, type: 'asset' | 'debt', linkedTo?: FinanceEntry, baseCurrency: string, rates?: Record<string, number>, onUpdate: (e: FinanceEntry) => void }> = ({ item, type, linkedTo, baseCurrency, rates, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const progress = item.initialAmount ? Math.max(0, 100 - (item.amount / item.initialAmount * 100)) : 0;
  
  const getConverted = (amount: number) => {
    if (!item.currency || item.currency === baseCurrency) return amount;
    const rateToBase = rates?.[item.currency];
    if (rateToBase) return amount / rateToBase;
    return amount;
  };

  const convertedValue = getConverted(item.amount);
  const isForeign = item.currency && item.currency !== baseCurrency;

  const format = (val: number, curr: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleCategoryChange = (cat: string) => {
    onUpdate({ ...item, category: cat });
    setIsEditing(false);
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${type === 'asset' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {type === 'asset' ? '↑' : '↓'}
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-slate-900 leading-tight truncate">{item.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              {isEditing ? (
                <select 
                  className="text-[9px] font-black uppercase tracking-widest bg-slate-100 rounded px-1"
                  value={item.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  onBlur={() => setIsEditing(false)}
                  autoFocus
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <span 
                  onClick={() => setIsEditing(true)}
                  className="text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
                >
                  {item.category || 'Categorize'}
                </span>
              )}
              {linkedTo && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md truncate">🔗 {linkedTo.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <p className="text-lg font-black text-slate-900">{format(convertedValue, baseCurrency)}</p>
          {isForeign && (
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
              {format(item.amount, item.currency!)}
            </p>
          )}
        </div>
      </div>

      {type === 'debt' && (
        <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
          <div className="space-y-1">
             <p className="text-[9px] font-black uppercase text-slate-400">Monthly EMI</p>
             <p className="text-xs font-bold text-slate-900">{item.emi ? format(item.emi, item.currency || baseCurrency) : 'Not set'}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[9px] font-black uppercase text-slate-400">Months Left</p>
             <p className="text-xs font-bold text-slate-900">{item.monthsRemaining || 'Not set'} cycles</p>
          </div>
        </div>
      )}

      {type === 'debt' && item.initialAmount && (
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
          <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
            <span>Payoff Progress</span>
            <span>{Math.round(progress)}% Extinguished</span>
          </div>
          <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ label }: { label: string }) => (
  <div className="p-10 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
    <p className="text-xs font-bold text-slate-400 italic">{label}</p>
  </div>
);

export default MatrixView;
