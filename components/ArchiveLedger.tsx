
import React, { useMemo, useState } from 'react';
import { UserData, EntryType, FinanceEntry } from '../types';
import { estimatePropertyValuation } from '../services/geminiService';

interface ArchiveLedgerProps {
  data: UserData;
  onUpdateEntry: (entry: FinanceEntry) => void;
}

const ArchiveLedger: React.FC<ArchiveLedgerProps> = ({ data, onUpdateEntry }) => {
  const [search, setSearch] = useState('');
  const [valuatingId, setValuatingId] = useState<string | null>(null);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, FinanceEntry[]> = {};
    
    const filtered = data.entries.filter(e => 
      e.name.toLowerCase().includes(search.toLowerCase()) || 
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.address && e.address.toLowerCase().includes(search.toLowerCase()))
    );

    filtered.forEach(entry => {
      const month = (entry.date || 'Unknown').slice(0, 7);
      if (!groups[month]) groups[month] = [];
      groups[month].push(entry);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data.entries, search]);

  const handleRevaluate = async (entry: FinanceEntry) => {
    if (!entry.address) return;
    
    // Check for API key presence
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      alert("Please connect your Gemini API key in the 'Mind' tab to use property re-valuation.");
      return;
    }

    setValuatingId(entry.id);
    try {
      const result = await estimatePropertyValuation(
        entry.address, 
        entry.plotSize, 
        entry.propertyType
      );

      const updatedEntry: FinanceEntry = {
        ...entry,
        amount: result.estimatedValue || entry.amount,
        lastValuated: new Date().toISOString(),
        valuationSources: result.sources,
        notes: (entry.notes ? entry.notes + '\n\n' : '') + `AI Audit (${new Date().toLocaleDateString()}): ${result.reasoning}`
      };

      onUpdateEntry(updatedEntry);
    } catch (err) {
      console.error("Re-valuation failed", err);
      alert("Could not reach market protocols. Check your connection.");
    } finally {
      setValuatingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="space-y-4">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Vault Ledger</h2>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search merchants, categories, or locations..."
            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-3xl outline-none font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-emerald-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {groupedEntries.map(([month, entries]) => (
          <div key={month} className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-4">
              {new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
              {entries.map(entry => {
                const isRealEstate = entry.address && (entry.type === EntryType.ASSET || entry.type === EntryType.LIABILITY);
                const isValuating = valuatingId === entry.id;

                return (
                  <div key={entry.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                        entry.type === EntryType.ASSET ? 'bg-emerald-50 text-emerald-600' : 
                        entry.type === EntryType.LIABILITY ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {entry.type === EntryType.ASSET ? '↓' : '↑'}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm leading-tight">{entry.name}</p>
                          {entry.lastValuated && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                              AI Audit {new Date(entry.lastValuated).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                            entry.category.toLowerCase().includes('need') ? 'bg-emerald-100 text-emerald-700' :
                            entry.category.toLowerCase().includes('saving') || entry.category.toLowerCase().includes('house') ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {entry.category}
                          </span>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                        {entry.address && (
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{entry.address}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center gap-3">
                      <div className="space-y-1">
                        <p className={`font-black text-sm ${entry.type === EntryType.ASSET ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {entry.type === EntryType.ASSET ? '+' : '-'}${entry.amount.toLocaleString()}
                        </p>
                        {isRealEstate && entry.valuationSources && entry.valuationSources.length > 0 && (
                          <div className="flex gap-1 justify-end">
                            {entry.valuationSources.slice(0, 2).map((s, idx) => (
                              <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] text-indigo-400 underline font-black">Ref{idx+1}</a>
                            ))}
                          </div>
                        )}
                      </div>

                      {isRealEstate && (
                        <button
                          onClick={() => handleRevaluate(entry)}
                          disabled={isValuating}
                          title="Refresh Market Value"
                          className={`p-2 rounded-full transition-all ${isValuating ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'}`}
                        >
                          <svg className={`w-4 h-4 ${isValuating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {groupedEntries.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="text-6xl grayscale opacity-20">📂</div>
            <p className="text-slate-400 font-bold italic">No archived records found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveLedger;
