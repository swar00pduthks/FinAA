
import React, { useState } from 'react';
import { UserData, Goal, EntryType } from '../types';

interface GoalsTrackerProps {
  data: UserData;
  onAddGoal: (goal: Goal) => void;
  onUpdateGoalProgress: (goalId: string, amount: number) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Travel: '✈️',
  House: '🏠',
  Education: '🎓',
  Wedding: '💍',
  Retirement: '🌴',
  Emergency: '🚨',
  Other: '📦'
};

const GoalsTracker: React.FC<GoalsTrackerProps> = ({ data, onAddGoal, onUpdateGoalProgress }) => {
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    category: 'Travel' as Goal['category'],
    linkedAssetId: ''
  });

  const assets = data.entries.filter(e => e.type === EntryType.ASSET);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.targetAmount) return;
    
    onAddGoal({
      id: crypto.randomUUID(),
      name: newGoal.name,
      targetAmount: parseFloat(newGoal.targetAmount),
      currentAmount: parseFloat(newGoal.currentAmount || '0'),
      deadline: newGoal.deadline,
      category: newGoal.category,
      linkedAssetId: newGoal.linkedAssetId || undefined
    });
    
    setNewGoal({ name: '', targetAmount: '', currentAmount: '', deadline: '', category: 'Travel', linkedAssetId: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Future Aspirations</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Goals & Savings Pots</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
        >
          {showForm ? 'Close' : '+ Create Pot'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 animate-in zoom-in duration-300">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dream House"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800"
                  value={newGoal.name}
                  onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800 appearance-none"
                  value={newGoal.category}
                  onChange={e => setNewGoal({...newGoal, category: e.target.value as any})}
                >
                  {Object.keys(CATEGORY_ICONS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Amount</label>
                <input
                  type="number"
                  placeholder="50000"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800"
                  value={newGoal.targetAmount}
                  onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Saved</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800"
                  value={newGoal.currentAmount}
                  onChange={e => setNewGoal({...newGoal, currentAmount: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Deadline (Optional)</label>
                <input
                  type="date"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800"
                  value={newGoal.deadline}
                  onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Link to Bank Account</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800 appearance-none"
                  value={newGoal.linkedAssetId}
                  onChange={e => setNewGoal({...newGoal, linkedAssetId: e.target.value})}
                >
                  <option value="">No link (Manual tracking)</option>
                  {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-black transition-all">
              Initialize Saving Pot
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.goals.length > 0 ? data.goals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const linkedAsset = assets.find(a => a.id === goal.linkedAssetId);
          
          return (
            <div key={goal.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-6 text-3xl opacity-20 group-hover:scale-125 transition-transform duration-500">
                {CATEGORY_ICONS[goal.category]}
              </div>
              
              <div className="space-y-6 relative z-10">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{goal.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target: ${goal.targetAmount.toLocaleString()}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-black text-slate-900">${goal.currentAmount.toLocaleString()}</span>
                    <span className="text-xs font-black text-indigo-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                      {goal.deadline ? `Due: ${new Date(goal.deadline).toLocaleDateString()}` : 'Ongoing'}
                    </span>
                  </div>
                  {linkedAsset && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                      <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{linkedAsset.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const add = prompt('How much would you like to add to this pot?');
                      if (add && !isNaN(parseFloat(add))) {
                        onUpdateGoalProgress(goal.id, parseFloat(add));
                      }
                    }}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    Contribute
                  </button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="text-6xl grayscale opacity-20">🎯</div>
            <p className="text-slate-400 font-medium italic">Your financial map is empty. Start by creating a dream pot.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsTracker;
