
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UserData } from '../types';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const FinancialChat: React.FC<{ data: UserData }> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: `Hello ${data.settings.userName}. I'm your FinAA Intelligence Companion. How can I help you analyze your wealth today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        You are FinAA, an elite financial intelligence AI. 
        User's current financial data:
        - Net Worth: $${(data.entries.reduce((acc, e) => acc + (e.type === 'ASSET' ? e.amount : e.type === 'LIABILITY' ? -e.amount : 0), 0)).toLocaleString()}
        - Entries: ${JSON.stringify(data.entries.slice(0, 50))} 
        - Goals: ${JSON.stringify(data.goals)}
        
        Question: ${userMsg}
        
        Answer professionally but concisely. Use a "Swiss-Tech" professional tone. Focus on growth and protection.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "I couldn't process that request." }]);
    } catch (err) {
      console.error("Chat Error", err);
      setMessages(prev => [...prev, { role: 'ai', text: "Protocol Error: Secure link to Intelligence Core failed. Ensure API access is enabled." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-[2rem] shadow-2xl z-[100] flex items-center justify-center transition-all active:scale-95 ${isOpen ? 'bg-rose-500 rotate-45' : 'bg-emerald-600 hover:bg-emerald-500 animate-bounce'}`}
      >
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M13 10V3L4 14h7v7l9-11h-7z"} /></svg>
      </button>

      {/* Chat Panel */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-sm bg-slate-950/95 backdrop-blur-xl border-l border-white/10 z-[90] shadow-2xl transition-transform duration-500 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <header className="p-8 border-b border-white/5">
             <h3 className="text-xl font-black text-white tracking-tighter">Intelligence Core</h3>
             <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Natural Language Reasoning</p>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-300 border border-white/10 rounded-tl-none italic'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-4 rounded-3xl rounded-tl-none border border-white/10 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/5">
            <div className="relative">
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-12 text-white outline-none focus:border-emerald-500/50 transition-all font-medium text-sm"
                placeholder="Ask your finances anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FinancialChat;
