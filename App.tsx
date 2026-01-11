
import React, { useState, useEffect, useCallback } from 'react';
import { UserData, FinanceEntry, Goal, LegacyProfile, EntryType } from './types';
import { driveService } from './services/googleDriveService';
import { fetchExchangeRates } from './services/geminiService';
import Dashboard from './components/Dashboard';
import FinanceForms from './components/FinanceForms';
import AiInsights from './components/AiInsights';
import SafetyNet from './components/SafetyNet';
import GoalsTracker from './components/GoalsTracker';
import MatrixView from './components/MatrixView';
import BudgetView from './components/BudgetView';
import SecurityVault, { PrivacyTermsModal } from './components/SecurityVault';
import FinancialChat from './components/FinancialChat';
import CsvImporter from './components/CsvImporter';

const App: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'command' | 'matrix' | 'budget' | 'scan' | 'shield' | 'mind'>('command');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const initDrive = async () => {
      try {
        await driveService.init();
      } catch (err) {
        console.error("Storage Init Error", err);
      } finally {
        setIsLoading(false);
      }
    };
    initDrive();
  }, []);

  const updateExchangeRates = useCallback(async (userData: UserData) => {
    const currenciesUsed = Array.from(new Set(userData.entries.map(e => e.currency).filter(Boolean))) as string[];
    if (currenciesUsed.length > 0) {
      try {
        const rates = await fetchExchangeRates(userData.settings.currency, currenciesUsed);
        const updatedUser = { ...userData, exchangeRates: rates };
        setUser(updatedUser);
        await driveService.saveData(updatedUser);
      } catch (e) {
        console.error("Failed to sync exchange rates", e);
      }
    }
  }, []);

  const handleLogin = async (mode: 'drive' | 'local-db' | 'local-fs') => {
    setAuthError(null);
    try {
      setIsLoading(true);
      await driveService.login(mode);
      const fileId = await driveService.findFile('finaa_vault_v1.json');
      
      let data: UserData;
      if (fileId) {
        try {
          data = await driveService.downloadData(fileId);
        } catch (e) {
          data = createInitialData();
        }
      } else {
        data = createInitialData();
        await driveService.saveData(data);
      }
      
      if (!data.goals) data.goals = [];
      if (!data.settings) data.settings = createInitialData().settings;
      
      setUser(data);
      setIsAuthenticated(true);
      if (data.settings.biometricEnabled) setIsVaultLocked(true);

      updateExchangeRates(data);
    } catch (err: any) {
      console.error("Auth Error", err);
      setAuthError(err.message || "Could not access storage. Check permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const createInitialData = (): UserData => ({
    entries: [],
    goals: [],
    lastSynced: new Date().toISOString(),
    settings: {
      currency: 'USD',
      userName: 'FinAA User',
      biometricEnabled: false,
      termsAccepted: false,
      monthlyBudgetLimit: 5000
    }
  });

  const syncToCloud = useCallback(async (newData: UserData) => {
    setSyncStatus('syncing');
    try {
      await driveService.saveData(newData);
      if (driveService.mode === 'drive') {
        const sheetId = await driveService.syncToSpreadsheet(newData.entries);
        if (sheetId && newData.settings.spreadsheetId !== sheetId) {
          newData.settings.spreadsheetId = sheetId;
          await driveService.saveData(newData);
        }
      }
      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error("Sync Error", err);
      setSyncStatus('idle');
    }
  }, []);

  const addEntry = (entry: FinanceEntry) => {
    if (!user) return;
    const updatedUser = { ...user, entries: [entry, ...user.entries], lastSynced: new Date().toISOString() };
    setUser(updatedUser);
    syncToCloud(updatedUser);
    updateExchangeRates(updatedUser);
  };

  const updateEntry = (updatedEntry: FinanceEntry) => {
    if (!user) return;
    const updatedUser = { ...user, entries: user.entries.map(e => e.id === updatedEntry.id ? updatedEntry : e), lastSynced: new Date().toISOString() };
    setUser(updatedUser);
    syncToCloud(updatedUser);
  };

  const addEntries = (newEntries: FinanceEntry[]) => {
    if (!user) return;
    const updatedUser = { ...user, entries: [...newEntries, ...user.entries], lastSynced: new Date().toISOString() };
    setUser(updatedUser);
    syncToCloud(updatedUser);
    updateExchangeRates(updatedUser);
    setActiveTab('command');
  };

  const updateLegacy = (legacy: LegacyProfile) => {
    if (!user) return;
    const updatedUser = { ...user, legacy, lastSynced: new Date().toISOString() };
    setUser(updatedUser);
    syncToCloud(updatedUser);
  };

  const acceptTerms = () => {
    if (!user) return;
    const updatedUser = { ...user, settings: { ...user.settings, termsAccepted: true } };
    setUser(updatedUser);
    syncToCloud(updatedUser);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
        <p className="mt-6 text-emerald-400 font-bold tracking-[0.2em] uppercase text-[10px] animate-pulse">Establishing Command...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white relative">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,_#065f46_0%,_#020617_100%)]"></div>
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-10 rounded-[4rem] shadow-2xl text-center space-y-8 border border-white/10 relative z-10 animate-in fade-in duration-1000">
          <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
             <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tighter">FinAA</h1>
            <p className="text-slate-400 font-black uppercase tracking-widest text-[9px]">Financial Intelligence Suite</p>
          </div>
          <div className="space-y-3 pt-2">
            <button onClick={() => handleLogin('drive')} className="w-full bg-white text-slate-900 font-black py-5 px-6 rounded-[2rem] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 group">
              <img src="https://www.gstatic.com/images/branding/product/1x/google_64dp.png" className="w-6 h-6 group-hover:rotate-12 transition-transform" alt="Google" />
              Mirror Drive Archive
            </button>
            <button onClick={() => handleLogin('local-fs')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-[2rem] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/40">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              Project Folder Mode
            </button>
            <button onClick={() => handleLogin('local-db')} className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-5 rounded-[2rem] transition-all active:scale-95 text-[10px] uppercase tracking-[0.2em]">
              Fast Guest Vault
            </button>
          </div>
          {authError && <div className="p-4 bg-rose-500/10 text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20">{authError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-28">
      {user && !user.settings.termsAccepted && <PrivacyTermsModal onAccept={acceptTerms} />}
      <SecurityVault enabled={isVaultLocked} onUnlock={() => setIsVaultLocked(false)} legacy={user?.legacy} />

      <header className="sticky top-0 z-50 glass border-b border-slate-200/50 px-6 py-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-emerald-400 font-black text-xl">F</span></div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">FinAA</h1>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">
              {driveService.mode === 'local-fs' ? 'Hardware Direct' : driveService.mode === 'drive' ? 'Cloud Mirror' : 'IDB Vault'}
            </p>
          </div>
        </div>
        <div className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border flex items-center gap-2 ${syncStatus === 'syncing' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
          {syncStatus === 'syncing' ? 'Syncing...' : 'Encrypted'}
        </div>
      </header>

      <main className={`flex-1 max-w-2xl w-full mx-auto p-6 space-y-8 transition-all duration-1000 ${isVaultLocked ? 'blur-3xl' : ''}`}>
        {activeTab === 'command' && user && (
          <div className="space-y-6">
            <CsvImporter onImport={addEntries} baseCurrency={user.settings.currency} />
            <Dashboard data={user} />
          </div>
        )}
        {activeTab === 'matrix' && user && <MatrixView data={user} onUpdateEntry={updateEntry} />}
        {activeTab === 'budget' && user && <BudgetView data={user} />}
        {activeTab === 'scan' && user && <FinanceForms onAdd={addEntry} onAddBulk={addEntries} baseCurrency={user.settings.currency} />}
        {activeTab === 'shield' && user && <SafetyNet data={user} onUpdateLegacy={updateLegacy} />}
        {activeTab === 'mind' && user && <AiInsights data={user} />}
      </main>

      <nav className={`fixed bottom-6 left-6 right-6 h-20 bg-slate-950 rounded-[2.5rem] shadow-2xl flex items-center justify-around px-2 z-50 border border-white/5 transition-transform ${isVaultLocked ? 'translate-y-32' : ''}`}>
        <NavButton active={activeTab === 'command'} onClick={() => setActiveTab('command')} icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" label="Home" />
        <NavButton active={activeTab === 'matrix'} onClick={() => setActiveTab('matrix')} icon="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" label="Matrix" />
        <NavButton active={activeTab === 'budget'} onClick={() => setActiveTab('budget')} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label="Budget" />
        <NavButton active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} icon="M12 4v16m8-8H4" label="Scan" />
        <NavButton active={activeTab === 'shield'} onClick={() => setActiveTab('shield')} icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" label="Shield" />
        <NavButton active={activeTab === 'mind'} onClick={() => setActiveTab('mind')} icon="M13 10V3L4 14h7v7l9-11h-7z" label="Mind" />
      </nav>

      {user && <FinancialChat data={user} />}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center transition-all duration-300 gap-1.5 flex-1 ${active ? 'text-emerald-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}>
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={icon} /></svg>
    <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
  </button>
);

export default App;
