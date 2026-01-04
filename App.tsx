
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  Zap, 
  BrainCircuit, 
  ChevronRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { ResourceConfig, PeakSimulation, AIAdvice, CalculationMode } from './types';
import { getAIAdvice } from './services/geminiService';

const App: React.FC = () => {
  const [config, setConfig] = useState<ResourceConfig>({
    currentAmount: 12000,
    dailyIncome: 450,
    targetAmount: 24000,
    bonusPercentage: 10
  });

  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.RESOURCES);

  // Simulation logic
  const simulationData = useMemo(() => {
    const data: PeakSimulation[] = [];
    let current = config.currentAmount;
    const dailyWithBonus = config.dailyIncome * (1 + config.bonusPercentage / 100);
    
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      data.push({
        date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        amount: Math.floor(current),
        isPeak: current >= config.targetAmount
      });
      current += dailyWithBonus;
    }
    return data;
  }, [config]);

  const daysToTarget = useMemo(() => {
    const dailyWithBonus = config.dailyIncome * (1 + config.bonusPercentage / 100);
    const needed = config.targetAmount - config.currentAmount;
    return needed <= 0 ? 0 : Math.ceil(needed / dailyWithBonus);
  }, [config]);

  const handleAIAnalysis = async () => {
    setIsLoadingAI(true);
    try {
      const advice = await getAIAdvice(config);
      setAiAdvice(advice);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <TrendingUp size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">APEX CALCULATOR</h1>
              <p className="text-xs text-slate-500 font-medium">Strategic Peak Optimization</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMode(mode === CalculationMode.RESOURCES ? CalculationMode.RAID_SCORE : CalculationMode.RESOURCES)}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              {mode === CalculationMode.RESOURCES ? "Raid Mode" : "Resource Mode"}
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <section className="glass-card p-6 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Zap size={16} /> Parameters
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Current Amount</label>
                <input 
                  type="number" 
                  value={config.currentAmount}
                  onChange={(e) => setConfig({...config, currentAmount: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Daily Income</label>
                <input 
                  type="number" 
                  value={config.dailyIncome}
                  onChange={(e) => setConfig({...config, dailyIncome: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Target Goal</label>
                <input 
                  type="number" 
                  value={config.targetAmount}
                  onChange={(e) => setConfig({...config, targetAmount: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Bonus Multiplier (%)</label>
                <div className="flex gap-4 items-center">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={config.bonusPercentage}
                    onChange={(e) => setConfig({...config, bonusPercentage: Number(e.target.value)})}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="w-12 text-right font-mono font-bold text-blue-600">{config.bonusPercentage}%</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleAIAnalysis}
              disabled={isLoadingAI}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            >
              <BrainCircuit size={20} className={isLoadingAI ? "animate-spin" : ""} />
              {isLoadingAI ? "Analyzing Strategy..." : "Get AI Advice"}
            </button>
          </section>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-400 mb-1"><Calendar size={18} /></div>
              <div className="text-2xl font-black text-slate-900">{daysToTarget}</div>
              <div className="text-xs text-slate-500 font-medium">Days to Peak</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-blue-500 mb-1"><Target size={18} /></div>
              <div className="text-2xl font-black text-slate-900">
                {Math.round((config.currentAmount / config.targetAmount) * 100)}%
              </div>
              <div className="text-xs text-slate-500 font-medium">Completion</div>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization & AI Advice */}
        <div className="lg:col-span-8 space-y-8">
          {/* Chart Section */}
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Growth Projection</h2>
                <p className="text-slate-500 text-sm">Real-time simulation based on current efficiency</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  <TrendingUp size={12} /> Positive Trend
                </span>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulationData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: '#94a3b8'}}
                    interval={7}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: '#94a3b8'}}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* AI Advice Section */}
          {aiAdvice && (
            <section className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <BrainCircuit size={120} />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500 rounded-lg">
                    <Info size={20} />
                  </div>
                  <h3 className="text-xl font-bold">Tactical Advisory Report</h3>
                </div>
                
                <p className="text-indigo-100 text-lg leading-relaxed max-w-2xl">
                  {aiAdvice.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-300">Strategy Recommendations</h4>
                    <ul className="space-y-3">
                      {aiAdvice.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <ChevronRight size={18} className="text-indigo-400 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4">Peak Statistics</h4>
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <div className="text-xs text-indigo-300">Est. Peak Date</div>
                          <div className="text-2xl font-black">{aiAdvice.estimatedPeakDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-indigo-300">Efficiency</div>
                          <div className="text-2xl font-black text-emerald-400">{aiAdvice.efficiencyRating}%</div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${aiAdvice.efficiencyRating}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {!aiAdvice && !isLoadingAI && (
             <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
               <BrainCircuit size={48} className="mb-4 opacity-20" />
               <p className="text-sm font-medium">Click "Get AI Advice" to generate a custom strategic report.</p>
             </div>
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-4 mt-8 flex justify-between items-center text-slate-400 text-xs font-medium">
        <div>&copy; 2024 Apex Tactical Systems. All rights reserved.</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-600 transition-colors underline decoration-slate-200">System Logs</a>
          <a href="#" className="hover:text-slate-600 transition-colors underline decoration-slate-200">Documentation</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
