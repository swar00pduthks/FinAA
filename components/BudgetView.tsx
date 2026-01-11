
import React, { useMemo } from 'react';
import { UserData, EntryType } from '../types';

const BudgetView: React.FC<{ data: UserData }> = ({ data }) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthName = new Date().toLocaleString('default', { month: 'long' });

  const budget = useMemo(() => {
    let needs = 0, wants = 0, savings = 0;
    const limit = data.settings.monthlyBudgetLimit || 5000;

    data.entries.forEach(e => {
      if ((e.date || '').slice(0, 7) !== currentMonth) return;
      if (e.type === EntryType.EXPENSE || e.type === EntryType.BILL) {
        const cat = (e.category || '').toLowerCase();
        if (cat.includes('need') || cat.includes('rent') || cat.includes('bill') || cat.includes('food')) needs += e.amount;
        else if (cat.includes('want') || cat.includes('play') || cat.includes('dine')) wants += e.amount;
        else if (cat.includes('saving') || cat.includes('invest') || cat.includes('debt')) savings += e.amount;
        else wants += e.amount; // Default to wants
      }
    });

    return { needs, wants, savings, total: needs + wants + savings, limit };
  }, [data, currentMonth]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-6 duration-700 pb-12">
      <header className="space-y-1 pt-4">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Monthly Burn</h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analysis for {monthName} {new Date().getFullYear()}</p>
      </header>

      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
        <div className="space-y-2">
           <div className="flex justify-between items-end">
              <p className="text-4xl font-black text-slate-900 tracking-tighter">${budget.total.toLocaleString()}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limit: ${budget.limit.toLocaleString()}</p>
           </div>
           <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${budget.total > budget.limit ? 'bg-rose-500' : 'bg-slate-950'}`}
                style={{ width: `${Math.min(100, (budget.total / budget.limit) * 100)}%` }}
              ></div>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
           <BudgetProgress label="Essentials (50%)" spent={budget.needs} target={budget.limit * 0.5} color="bg-emerald-500" />
           <BudgetProgress label="Lifestyle (30%)" spent={budget.wants} target={budget.limit * 0.3} color="bg-amber-400" />
           <BudgetProgress label="Security (20%)" spent={budget.savings} target={budget.limit * 0.2} color="bg-indigo-500" />
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-4">Burn Feed</h3>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden divide-y divide-slate-50">
           {data.entries.filter(e => (e.date || '').slice(0, 7) === currentMonth && (e.type === EntryType.EXPENSE || e.type === EntryType.BILL)).map(item => (
             <div key={item.id} className="p-5 flex items-center justify-between">
                <div>
                   <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                   <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{item.category}</p>
                </div>
                <p className="font-black text-slate-900">-${item.amount.toLocaleString()}</p>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
};

const BudgetProgress = ({ label, spent, target, color }: any) => {
  const percentage = Math.min(100, (spent / target) * 100);
  return (
    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
       <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
          <span className="text-xs font-black text-slate-900">${spent.toLocaleString()} / ${target.toLocaleString()}</span>
       </div>
       <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
       </div>
    </div>
  );
};

export default BudgetView;
