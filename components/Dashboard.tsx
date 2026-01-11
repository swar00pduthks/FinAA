
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, XAxis, Tooltip, BarChart, Bar, Cell, Legend } from 'recharts';
import { UserData, EntryType } from '../types';

const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'];

const Dashboard: React.FC<{ data: UserData }> = ({ data }) => {
  const getConvertedAmount = (amount: number, fromCurrency?: string) => {
    if (!fromCurrency || fromCurrency === data.settings.currency) return amount;
    const rates = data.exchangeRates || {};
    const rateToBase = rates[fromCurrency]; 
    if (rateToBase) return amount / rateToBase;
    return amount;
  };

  const stats = useMemo(() => {
    let assets = 0, debt = 0, burn = 0, monthlyInflow = 0, savings = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    data.entries.forEach(e => {
      const amt = getConvertedAmount(Number(e.amount) || 0, e.currency);
      const entryMonth = (e.date || '').slice(0, 7);

      if (e.type === EntryType.ASSET) {
        assets += amt;
        if (entryMonth === currentMonth) {
          if (e.category === 'Income') monthlyInflow += amt;
          if (e.category === 'Savings' || e.category === 'Investments') savings += amt;
        }
      }
      else if (e.type === EntryType.LIABILITY) debt += amt;
      else if ((e.type === EntryType.EXPENSE || e.type === EntryType.BILL) && entryMonth === currentMonth) {
        burn += amt;
      }
    });

    const netWorth = assets - debt;
    const netFlow = monthlyInflow - burn;
    const savingsRate = monthlyInflow > 0 ? Math.round((savings / monthlyInflow) * 100) : 0;
    const debtBurden = monthlyInflow > 0 ? Math.round((debt / (monthlyInflow * 12)) * 100) : 0; // Debt vs Projected Annual Income
    const emergencyFundMonths = burn > 0 ? (assets / burn).toFixed(1) : '∞';
    
    return { assets, debt, netWorth, burn, monthlyInflow, netFlow, savingsRate, debtBurden, emergencyFundMonths };
  }, [data]);

  const spendingBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    data.entries.forEach(e => {
      if ((e.date || '').slice(0, 7) === currentMonth && (e.type === EntryType.EXPENSE || e.type === EntryType.BILL)) {
        const cat = e.category || 'General';
        categories[cat] = (categories[cat] || 0) + getConvertedAmount(e.amount, e.currency);
      }
    });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [data]);

  const flowChartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    }).reverse();

    return months.map(m => {
      let income = 0, expenses = 0;
      data.entries.forEach(e => {
        if ((e.date || '').slice(0, 7) === m) {
          const amt = getConvertedAmount(e.amount, e.currency);
          if (e.type === EntryType.ASSET && e.category === 'Income') income += amt;
          else if (e.type === EntryType.EXPENSE || e.type === EntryType.BILL) expenses += amt;
        }
      });
      return { 
        month: new Date(m + '-01').toLocaleString('default', { month: 'short' }), 
        Income: income, 
        Expenses: expenses
      };
    });
  }, [data]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: data.settings.currency,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="space-y-2 pt-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Command Center</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Normalized to {data.settings.currency} • Real-time Intelligence
          </p>
        </div>
      </header>

      {/* Main Wealth Card */}
      <div className="bg-slate-950 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full -mr-40 -mt-40"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
          <div className="space-y-1">
             <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest">Net Worth Assets</p>
             <p className="text-5xl font-black text-white tracking-tighter truncate">{formatCurrency(stats.netWorth)}</p>
          </div>
          <div className="space-y-1">
             <p className="text-rose-500/50 text-[10px] font-black uppercase tracking-widest">Active Liabilities</p>
             <p className="text-3xl font-black text-slate-400 tracking-tighter truncate">{formatCurrency(stats.debt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Savings Rate" value={`${stats.savingsRate}%`} sub="Monthly Surplus" color="emerald" />
        <StatTile label="Debt Burden" value={`${stats.debtBurden}%`} sub="Annual Inflow Ratio" color="rose" />
        <StatTile label="Runway" value={`${stats.emergencyFundMonths}m`} sub="Coverage" color="blue" />
        <StatTile label="Surplus" value={formatCurrency(stats.netFlow)} sub="Current Flow" color={stats.netFlow >= 0 ? "emerald" : "rose"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cash Flow Analysis Section */}
        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Monthly Cash Flow</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1.5rem', background: '#020617', border: 'none', color: '#fff' }} 
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Bar dataKey="Income" fill="#10b981" radius={[6, 6, 0, 0]} barSize={15} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Spend Breakdown */}
        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Spend Breakdown</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendingBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {spendingBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', background: '#020617', color: '#fff' }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};

const StatTile = ({ label, value, sub, color }: any) => {
  const colorMap: any = { 
    emerald: 'text-emerald-500', 
    amber: 'text-amber-500', 
    blue: 'text-blue-500',
    rose: 'text-rose-500'
  };
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-xl font-black ${colorMap[color]}`}>{value}</p>
      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{sub}</p>
    </div>
  );
};

export default Dashboard;
