
import React, { useMemo, useState } from 'react';
import { UserData, EntryType, FinanceEntry, LegacyProfile } from '../types';
import { driveService } from '../services/googleDriveService';

interface SafetyNetProps {
  data: UserData;
  onUpdateLegacy: (legacy: LegacyProfile) => void;
}

const SafetyNet: React.FC<SafetyNetProps> = ({ data, onUpdateLegacy }) => {
  const [showLegacyForm, setShowLegacyForm] = useState(false);
  const [successorName, setSuccessorName] = useState(data.legacy?.successorName || '');
  const [copied, setCopied] = useState(false);

  const { insurance, benefits, liquidity, liabilities } = useMemo(() => {
    const items = {
      insurance: [] as FinanceEntry[],
      benefits: [] as FinanceEntry[],
      liabilities: [] as FinanceEntry[],
      liquidity: { high: 0, medium: 0, low: 0, total: 0 }
    };

    data.entries.forEach(entry => {
      if (entry.type === EntryType.INSURANCE) items.insurance.push(entry);
      if (entry.type === EntryType.BENEFIT || entry.isWorkProvided) items.benefits.push(entry);
      if (entry.type === EntryType.LIABILITY) items.liabilities.push(entry);
      
      if (entry.type === EntryType.ASSET) {
        items.liquidity.total += entry.amount;
        if (entry.liquidity === 'high') items.liquidity.high += entry.amount;
        else if (entry.liquidity === 'medium') items.liquidity.medium += entry.amount;
        else items.liquidity.low += entry.amount;
      }
    });

    return items;
  }, [data]);

  const handleGeneratePasskey = () => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let passkey = "";
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) passkey += "-";
      passkey += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    onUpdateLegacy({
      successorName: successorName || 'Designated Successor',
      recoveryPasskey: passkey,
      isConfigured: true,
      lastUpdated: new Date().toISOString()
    });
    setShowLegacyForm(false);
  };

  const handleCopyPasskey = () => {
    if (!data.legacy) return;
    navigator.clipboard.writeText(data.legacy.recoveryPasskey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareProtocol = async () => {
    if (!data.legacy) return;
    const shareText = `FinAA LEGACY PROTOCOL\n\nDesignated Successor: ${data.legacy.successorName}\nRecovery Passkey: ${data.legacy.recoveryPasskey}\n\nIn the event of an emergency, use this passkey to access my private financial archive at: ${window.location.origin}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FinAA Legacy Protocol',
          text: shareText,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Instructions copied to clipboard. Share them securely with your dependent.");
    }
  };

  const coverageTypes = ['Life', 'Health', 'Home', 'Critical Illness'];
  const covered = insurance.map(i => i.category.toLowerCase());

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Storage Hub */}
      <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Vault Infrastructure</h3>
          <span className="text-[10px] font-black uppercase px-2 py-1 bg-slate-900 text-white rounded-md">
            {driveService.mode.toUpperCase()}
          </span>
        </div>
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900">
              {driveService.mode === 'local-fs' ? 'Hardware Project Folder' : driveService.mode === 'drive' ? 'Google Cloud Mirror' : 'IDB High-Speed Storage'}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              {driveService.mode === 'local-fs' ? 'Connected to local hardware filesystem.' : 'Optimized for massive datasets.'}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
        </div>
      </section>

      {/* Legacy & Trust Section */}
      <section className="bg-slate-950 text-white p-10 rounded-[4rem] shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 blur-[120px] rounded-full -mr-40 -mt-40"></div>
        <div className="space-y-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">Legacy Shield</h3>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Emergency Access Protocol</p>
            </div>
          </div>

          {data.legacy?.isConfigured ? (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
              <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Successor</span>
                  <span className="font-bold text-lg text-white">{data.legacy.successorName}</span>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Recovery Passkey</span>
                  <div className="flex items-center justify-between bg-slate-900 px-6 py-4 rounded-2xl border border-white/5 group/passkey">
                    <span className="font-mono font-black text-emerald-400 tracking-[0.2em] text-lg">
                      {data.legacy.recoveryPasskey}
                    </span>
                    <button 
                      onClick={handleCopyPasskey}
                      className={`p-2 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-white scale-110' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'}`}
                      title="Copy Passkey"
                    >
                      {copied ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleShareProtocol}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share Card
                </button>
                <button 
                  onClick={() => setShowLegacyForm(true)}
                  className="bg-white/10 hover:bg-white/20 text-white font-black py-5 rounded-[2rem] transition-all flex items-center justify-center gap-2"
                >
                  Reset Key
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-indigo-200/70 text-sm font-medium leading-relaxed italic">
                "Enable a designated dependent to access your vault in case of an emergency. They will be able to resolve insurance claims and loan settlements using your archived IDs."
              </p>
              <button 
                onClick={() => setShowLegacyForm(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-indigo-900 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                Setup Legacy Access
              </button>
            </div>
          )}

          {showLegacyForm && (
            <div className="p-8 bg-white rounded-[3rem] text-slate-900 space-y-6 animate-in zoom-in duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Designated Successor</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-bold placeholder:text-slate-300"
                  placeholder="Partner, Parent, or Attorney"
                  value={successorName}
                  onChange={e => setSuccessorName(e.target.value)}
                />
              </div>
              <button 
                onClick={handleGeneratePasskey}
                disabled={!successorName}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl disabled:opacity-30"
              >
                Generate Secure Passkey
              </button>
              <button onClick={() => setShowLegacyForm(false)} className="w-full text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancel</button>
            </div>
          )}
        </div>
      </section>

      {/* Existing Matrix Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
            Protection Matrix
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {coverageTypes.map(type => {
              const isCovered = covered.some(c => c.includes(type.toLowerCase()));
              return (
                <div key={type} className={`p-4 rounded-2xl border ${isCovered ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{type}</p>
                  <p className={`text-sm font-bold mt-1 ${isCovered ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {isCovered ? 'Active' : 'Gap'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-white">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Cash Access</h3>
          <div className="space-y-6">
            <LiquidityBar label="High (Cash)" value={liquidity.high} total={liquidity.total} color="bg-cyan-400" />
            <LiquidityBar label="Medium (Equity)" value={liquidity.medium} total={liquidity.total} color="bg-indigo-400" />
            <LiquidityBar label="Low (Property)" value={liquidity.low} total={liquidity.total} color="bg-slate-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Emergency Records</h3>
        <div className="space-y-4">
          {insurance.concat(benefits).concat(liabilities).map(item => (
            <PolicyItem key={item.id} item={item} />
          ))}
          {insurance.length === 0 && benefits.length === 0 && liabilities.length === 0 && (
            <p className="text-center py-10 text-slate-400 italic text-sm">No critical items found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const PolicyItem: React.FC<{ item: FinanceEntry }> = ({ item }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-black text-slate-900 text-sm leading-tight">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
              item.type === EntryType.LIABILITY ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
            }`}>
              {item.type}
            </span>
          </div>
        </div>
        <p className="text-sm font-bold text-slate-900">${(item.coverageAmount || item.amount).toLocaleString()}</p>
      </div>
      
      {item.referenceNumber && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Account ID</span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-600">
              {revealed ? item.referenceNumber : '•••• ••••'}
            </span>
            <button onClick={() => setRevealed(!revealed)} className="p-1 hover:bg-slate-200 rounded-lg">
              {revealed ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LiquidityBar = ({ label, value, total, color }: { label: string, value: number, total: number, color: string }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <span>${value.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

export default SafetyNet;
