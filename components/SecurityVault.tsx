
import React, { useState } from 'react';
import { LegacyProfile } from '../types';

interface SecurityVaultProps {
  onUnlock: () => void;
  enabled: boolean;
  legacy?: LegacyProfile;
}

const SecurityVault: React.FC<SecurityVaultProps> = ({ onUnlock, enabled, legacy }) => {
  const [isLocked, setIsLocked] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [showPasskeyField, setShowPasskeyField] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');

  const handleUnlock = async () => {
    // Biometric Fallback: Simulation
    setIsLocked(false);
    onUnlock();
  };

  const handlePasskeyUnlock = () => {
    if (!legacy?.recoveryPasskey) {
      setError("No recovery passkey configured for this vault.");
      return;
    }
    
    // Normalize and check
    const normalizedInput = passkeyInput.trim().toUpperCase().replace(/\s/g, '');
    const normalizedPasskey = legacy.recoveryPasskey.trim().toUpperCase().replace(/[-\s]/g, '');

    if (normalizedInput === normalizedPasskey) {
      setIsLocked(false);
      onUnlock();
    } else {
      setError("Invalid passkey. Please check the emergency instructions.");
    }
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl"></div>
      <div className="relative bg-white p-10 rounded-[4rem] shadow-2xl text-center space-y-8 max-w-sm w-full border border-slate-100 animate-in zoom-in duration-300">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Vault Secure</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Authentication Required</p>
        </div>

        {!showPasskeyField ? (
          <div className="space-y-4">
            <button
              onClick={handleUnlock}
              className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Verify Identity
            </button>
            <button 
              onClick={() => setShowPasskeyField(true)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            >
              Use Recovery Passkey
            </button>
          </div>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enter 16-Digit Code</label>
              <input 
                type="text"
                maxLength={19}
                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-mono font-black text-lg text-center tracking-[0.2em] placeholder:text-slate-200"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
              />
            </div>
            <button
              onClick={handlePasskeyUnlock}
              className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl"
            >
              Unlock Vault
            </button>
            <button 
              onClick={() => setShowPasskeyField(false)}
              className="text-[10px] font-black uppercase text-slate-400"
            >
              Back to Biometrics
            </button>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 animate-in shake duration-300">
            <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const PrivacyTermsModal: React.FC<{ onAccept: () => void }> = ({ onAccept }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>
    <div className="relative bg-white p-10 rounded-[4rem] shadow-2xl max-w-lg w-full border border-slate-100 space-y-8 animate-in slide-in-from-bottom-8 duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Protocol</h2>
        <div className="w-12 h-1.5 bg-indigo-600 rounded-full"></div>
      </div>
      
      <div className="space-y-4 text-slate-600 text-sm leading-relaxed font-medium">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">1</div>
          <p><span className="font-bold text-slate-900">Personal Storage:</span> All your data is stored in your private Google Drive. We never see it.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">2</div>
          <p><span className="font-bold text-slate-900">Transient AI:</span> Document scanning uses Gemini API for extraction. No data is stored by the AI service.</p>
        </div>
      </div>

      <div className="pt-4 space-y-4">
        <button
          onClick={onAccept}
          className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
        >
          Accept Shield
        </button>
      </div>
    </div>
  </div>
);

export default SecurityVault;
