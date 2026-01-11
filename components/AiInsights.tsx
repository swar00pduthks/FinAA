
import React, { useState, useEffect } from 'react';
import { UserData, FinancialHealth } from '../types';
import { analyzeFinancialHealth } from '../services/geminiService';

// Removed redundant window.aistudio declaration to avoid conflict with environment-provided AIStudio type.

interface AiInsightsProps {
  data: UserData;
}

const AiInsights: React.FC<AiInsightsProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore - window.aistudio is pre-configured in the environment
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    };
    checkKey();
  }, []);

  const handleConnectKey = async () => {
    try {
      // @ts-ignore - window.aistudio is pre-configured in the environment
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success after dialog opens as per instructions
    } catch (err) {
      console.error("Key selection failed", err);
    }
  };

  const handleAnalyze = async () => {
    if (!hasApiKey) {
      await handleConnectKey();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await analyzeFinancialHealth(data);
      setHealth(result);
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("Invalid API key. Please reconnect your Gemini account.");
      } else {
        setError("AI analysis failed. Ensure your Gemini API project has billing enabled.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Connect Your Gemini</h2>
            <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">
              To provide high-quality financial reasoning, Aegis uses your personal Gemini API account.
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={handleConnectKey}
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Configure Gemini Account
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            >
              Learn about Paid API Keys ↗
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/20 blur-[80px] rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight">Financial Aegis AI</h2>
            <p className="text-indigo-200 text-sm font-medium max-w-sm">
              Analyzing protocols with Gemini 3 Pro reasoning.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`px-10 py-5 bg-white text-indigo-900 font-black rounded-3xl transition-all shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-3`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-indigo-900/30 border-t-indigo-900 rounded-full animate-spin"></div>
                Analyzing Protocols...
              </>
            ) : 'Audit My Wealth'}
          </button>
          {hasApiKey && (
            <button 
              onClick={handleConnectKey}
              className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white/80 transition-colors"
            >
              Change API Key
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 p-6 rounded-3xl border border-rose-100 text-center font-black uppercase tracking-widest text-[10px]">
          {error}
        </div>
      )}

      {health && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <HealthScoreCard label="Survival Score" score={health.score} sub="General Health" />
            <HealthScoreCard label="Safety Net" score={health.safetyNetScore} sub="Protection Level" color="text-rose-500" />
            <HealthScoreCard label="Liquidity" score={Math.round(health.liquidityRatio * 100)} sub="Cash Availability" color="text-cyan-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                Executive Audit
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium italic text-lg">
                "{health.summary}"
              </p>
              
              <div className="space-y-4 pt-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Protective Measures Needed</h4>
                {health.gapAnalysis.missingInsurance.map((gap, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-bold text-rose-700">{gap}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                Strategic Improvements
              </h3>
              <div className="space-y-4">
                {health.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      {i + 1}
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>

              {health.gapAnalysis.riskWarnings.length > 0 && (
                <div className="mt-8 p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-3">Risk Exposure (Career Shift)</h4>
                  <ul className="space-y-2">
                    {health.gapAnalysis.riskWarnings.map((warning, i) => (
                      <li key={i} className="text-xs font-bold text-amber-900 flex gap-2">
                        <span className="text-amber-500">•</span> {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HealthScoreCard = ({ label, score, sub, color = "text-indigo-600" }: { label: string, score: number, sub: string, color?: string }) => (
  <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 text-center space-y-4">
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</h3>
    <div className="text-5xl font-black tracking-tighter text-slate-900">{score}%</div>
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
      <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000`} style={{ width: `${score}%` }}></div>
    </div>
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{sub}</p>
  </div>
);

export default AiInsights;
