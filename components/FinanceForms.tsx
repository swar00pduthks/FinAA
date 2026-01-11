
import React, { useState, useRef } from 'react';
import { EntryType, FinanceEntry, GroundingSource } from '../types';
import { processDocument, estimatePropertyValuation, ValuationResult } from '../services/geminiService';
import { driveService } from '../services/googleDriveService';

interface FinanceFormsProps {
  onAdd: (entry: FinanceEntry) => void;
  onAddBulk: (entries: FinanceEntry[]) => void;
  baseCurrency: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'CAD', 'AUD', 'CHF', 'CNY', 'AED'];

const FinanceForms: React.FC<FinanceFormsProps> = ({ onAdd, onAddBulk, baseCurrency }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [isValuating, setIsValuating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    currency: baseCurrency,
    type: EntryType.EXPENSE,
    category: 'Wants',
    address: '',
    plotSize: '',
    propertyType: 'Home',
    referenceNumber: '',
    date: new Date().toISOString().split('T')[0],
    isWorkProvided: false,
    liquidity: 'medium' as 'high' | 'medium' | 'low',
    coverageAmount: '',
    emi: '',
    monthsRemaining: ''
  });

  const handleValuation = async () => {
    if (!formData.address) {
      alert("Please provide an address to valuate.");
      return;
    }
    setIsValuating(true);
    try {
      const result = await estimatePropertyValuation(
        formData.address, 
        formData.plotSize, 
        formData.propertyType
      );
      setValuationResult(result);
      setFormData(prev => ({
        ...prev,
        amount: result.estimatedValue.toString(),
        currency: result.currency || prev.currency,
        name: prev.name || `${prev.propertyType}: ${formData.address.split(',')[0]}`,
        category: 'Investments'
      }));
    } catch (err) {
      console.error("Valuation failed", err);
      alert("Failed to fetch property valuation. Ensure your API key is configured.");
    } finally {
      setIsValuating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStep('Encoding Archive...');
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      setScanStep('AI Pattern Extraction...');
      const results = await processDocument(base64, file.type);
      
      if (results && results.length > 0) {
        setScanStep(`Archiving ${results.length} Entries...`);
        const newEntries: FinanceEntry[] = [];
        
        for (const res of results) {
          const driveId = await driveService.archiveStatement(base64, file.type, res.name || 'Unknown Merchant', res.date || new Date().toISOString().split('T')[0]);
          
          newEntries.push({
            id: crypto.randomUUID(),
            name: res.name || 'Unnamed Transaction',
            amount: res.amount || 0,
            currency: res.currency || baseCurrency,
            type: res.type as EntryType || EntryType.EXPENSE,
            category: res.category || 'General',
            referenceNumber: res.referenceNumber || '',
            date: res.date || new Date().toISOString().split('T')[0],
            isWorkProvided: res.isWorkProvided || false,
            liquidity: 'medium',
            coverageAmount: res.coverageAmount,
            statementDriveId: driveId || undefined
          });
        }
        
        onAddBulk(newEntries);
      } else {
        alert("No transactions found. Try a clearer image of your statement.");
      }
    } catch (err) {
      console.error("Scanning failed", err);
      alert("AI Scan failed. Please enter details manually.");
    } finally {
      setIsScanning(false);
      setScanStep('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    onAdd({
      id: crypto.randomUUID(),
      ...formData,
      amount: parseFloat(formData.amount),
      coverageAmount: formData.coverageAmount ? parseFloat(formData.coverageAmount) : undefined,
      emi: formData.emi ? parseFloat(formData.emi) : undefined,
      monthsRemaining: formData.monthsRemaining ? parseInt(formData.monthsRemaining) : undefined,
      valuationSources: valuationResult?.sources,
      lastValuated: valuationResult ? new Date().toISOString() : undefined
    });

    setFormData({
      name: '',
      amount: '',
      currency: baseCurrency,
      type: EntryType.EXPENSE,
      category: 'Wants',
      address: '',
      plotSize: '',
      propertyType: 'Home',
      referenceNumber: '',
      date: new Date().toISOString().split('T')[0],
      isWorkProvided: false,
      liquidity: 'medium',
      coverageAmount: '',
      emi: '',
      monthsRemaining: ''
    });
    setValuationResult(null);
  };

  const isRealEstate = (formData.type === EntryType.ASSET || formData.type === EntryType.LIABILITY) && 
    (formData.category.toLowerCase().includes('house') || 
     formData.category.toLowerCase().includes('property') || 
     formData.category.toLowerCase().includes('plot') ||
     formData.category.toLowerCase().includes('estate'));

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 max-w-xl mx-auto space-y-8 pb-12">
      <div className="text-center">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Financial Ledger</h3>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Manual entry or Smart Scan</p>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all group overflow-hidden relative"
        >
          {isScanning ? (
            <>
              <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
              <span className="animate-pulse">{scanStep || 'Analyzing Document...'}</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              AI Autonomous Scan
            </>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" className="hidden" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Record Type</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 appearance-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EntryType })}
                >
                  <option value={EntryType.ASSET}>Asset / Cash</option>
                  <option value={EntryType.LIABILITY}>Liability / Loan</option>
                  <option value={EntryType.EXPENSE}>One-time Expense</option>
                  <option value={EntryType.BILL}>Recurring Bill</option>
                  <option value={EntryType.INSURANCE}>Insurance Policy</option>
                  <option value={EntryType.BENEFIT}>Work Benefit</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 appearance-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Income">Income</option>
                  <option value="Needs">Needs</option>
                  <option value="Wants">Wants</option>
                  <option value="Debt">Debt</option>
                  <option value="Savings">Savings</option>
                  <option value="Investments">Investments</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {formData.type === EntryType.LIABILITY && (
              <div className="p-6 bg-rose-50 rounded-[2rem] border border-rose-100 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest px-1">Monthly EMI</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-white border border-rose-100 rounded-xl outline-none font-bold"
                    placeholder="Monthly payment"
                    value={formData.emi}
                    onChange={(e) => setFormData({ ...formData, emi: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest px-1">Months Left</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-white border border-rose-100 rounded-xl outline-none font-bold"
                    placeholder="E.g. 36"
                    value={formData.monthsRemaining}
                    onChange={(e) => setFormData({ ...formData, monthsRemaining: e.target.value })}
                  />
                </div>
              </div>
            )}

            {isRealEstate && (
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Real Estate Protocol</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Property Type</label>
                    <select
                      className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl outline-none font-bold text-slate-800"
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    >
                      <option value="Home">Home / Residential</option>
                      <option value="Plot">Vacant Plot / Land</option>
                      <option value="Commercial">Commercial space</option>
                      <option value="Apartment">Apartment / Unit</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plot Size (e.g. 2500 sqft)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl outline-none font-bold text-slate-800"
                      placeholder="Size + Unit"
                      value={formData.plotSize}
                      onChange={(e) => setFormData({ ...formData, plotSize: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Property Address</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-4 py-3 bg-white border border-slate-100 rounded-xl outline-none font-bold text-slate-800"
                      placeholder="Street, City, Country"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={handleValuation}
                      disabled={isValuating || !formData.address}
                      className="px-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
                    >
                      {isValuating ? '...' : 'Valuate'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!isRealEstate && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Entry Name</label>
                <input
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                  placeholder="Salary, Amazon, Life Insurance..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Value</label>
                <input
                  type="number"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1 md:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Currency</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 appearance-none"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                <input
                  type="date"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-emerald-200 mt-4 active:scale-95"
          >
            Archive Entry
          </button>
        </form>
      </div>
    </div>
  );
};

export default FinanceForms;
