/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import * as math from 'mathjs';
import { 
  Settings2, 
  Activity, 
  Palette, 
  Plus, 
  Minus,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Types ---

const DEFAULT_EQUATION = "a * sin(b * x) + c";
const DEFAULT_COLOR = "#ef4444"; // Red-500
const SAMPLE_POINTS = 200;

interface Point {
  x: number;
  y: number;
}

export default function App() {
  const [equation, setEquation] = useState(DEFAULT_EQUATION);
  const [parameters, setParameters] = useState<Record<string, number>>({ a: 1, b: 1, c: 0 });
  const [thickness, setThickness] = useState(2);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [xRange, setXRange] = useState({ min: -10, max: 10 });
  const [yRange, setYRange] = useState({ min: -5, max: 5 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Logic ---

  // Detect parameters from equation
  useEffect(() => {
    try {
      const node = math.parse(equation);
      const symbols: string[] = [];
      node.traverse((node: any) => {
        if (node.isSymbolNode && node.name !== 'x' && !math[node.name]) {
          symbols.push(node.name);
        }
      });
      
      const uniqueSymbols = Array.from(new Set(symbols));
      setParameters(prev => {
        const next: Record<string, number> = {};
        uniqueSymbols.forEach(s => {
          next[s] = prev[s] ?? 1;
        });
        return next;
      });
      setError(null);
    } catch (err: any) {
      setError("Fórmula inválida");
    }
  }, [equation]);

  // Generate plot data
  const data = useMemo(() => {
    const points: Point[] = [];
    const step = (xRange.max - xRange.min) / SAMPLE_POINTS;
    
    try {
      const compiled = math.compile(equation);
      for (let x = xRange.min; x <= xRange.max; x += step) {
        const scope = { ...parameters, x };
        const y = compiled.evaluate(scope);
        
        if (typeof y === 'number' && isFinite(y)) {
          points.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(4)) });
        }
      }
      setError(null);
    } catch (err: any) {
      // Handled by effect
    }
    
    return points;
  }, [equation, parameters, xRange]);

  const handleParamChange = (name: string, value: number) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const handleZoom = (factor: number) => {
    setXRange(prev => ({ 
      min: prev.min * factor, 
      max: prev.max * factor 
    }));
    setYRange(prev => ({ 
      min: prev.min * factor, 
      max: prev.max * factor 
    }));
  };

  const resetView = () => {
    setXRange({ min: -10, max: 10 });
    setYRange({ min: -5, max: 5 });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-[#E4E3E0] border-b border-[#141414] z-30">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <h1 className="text-sm font-bold uppercase tracking-tight">GraphyMath</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-[#141414] text-[#E4E3E0] rounded-full shadow-lg"
        >
          {isSidebarOpen ? <Plus className="w-5 h-5 rotate-45" /> : <Settings2 className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar / Mobile Overlay */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside 
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`
              fixed md:relative inset-y-0 left-0 w-80 bg-[#E4E3E0] border-r border-[#141414] 
              flex flex-col h-full z-40 overflow-y-auto shrink-0
              ${isSidebarOpen ? "shadow-2xl" : "hidden md:flex"}
            `}
          >
            <div className="p-6 border-b border-[#141414] hidden md:block">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-5 h-5" />
                <h1 className="text-xl font-bold tracking-tight uppercase">GraphyMath</h1>
              </div>
              <p className="text-[10px] opacity-50 font-mono tracking-widest uppercase">Scientific Plotting v1.1</p>
            </div>

            <div className="p-6 space-y-8 flex-1">
              <section>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-mono opacity-50 uppercase tracking-widest italic">Función f(x)</label>
                  {error && <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1">{error}</span>}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={equation}
                    onChange={(e) => setEquation(e.target.value)}
                    className={`w-full bg-white border-2 border-[#141414] px-4 py-3 font-mono text-lg transition-all focus:outline-none focus:bg-gray-50 ${error ? 'border-red-500' : ''}`}
                    placeholder="e.g. sin(x)"
                  />
                  <div className="absolute top-3 right-3 opacity-20 pointer-events-none italic font-serif">y=</div>
                </div>
              </section>

              {Object.keys(parameters).length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Settings2 className="w-4 h-4" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#141414]/70">Variables</h2>
                  </div>
                  <div className="space-y-7">
                    {Object.keys(parameters).map((p) => (
                      <div key={p} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-bold">Variable {p}:</span>
                          <span className="font-mono text-xs bg-[#141414] text-[#E4E3E0] px-3 py-1 rounded-sm">{parameters[p].toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          step="0.01"
                          value={parameters[p]}
                          onChange={(e) => handleParamChange(p, parseFloat(e.target.value))}
                          className="w-full h-8 accent-[#141414] cursor-pointer touch-none"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-8 border-t border-[#141414]/10 pt-8">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#141414]/70">Visualización</h2>
                </div>
                
                <div className="space-y-4">
                  <span className="text-[10px] font-mono opacity-50 uppercase block">Paleta de color</span>
                  <div className="grid grid-cols-6 gap-2">
                    {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#141414"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`aspect-square rounded-full border-2 transition-all ${color === c ? 'border-[#141414] scale-110 shadow-lg' : 'border-transparent scale-100'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono opacity-50 uppercase">Grosor línea</span>
                    <span className="font-mono text-[10px] border border-[#141414] px-2">{thickness}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={thickness}
                    onChange={(e) => setThickness(parseFloat(e.target.value))}
                    className="w-full h-8 accent-[#141414] cursor-pointer"
                  />
                </div>
              </section>
            </div>

            <div className="p-4 md:hidden">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="w-full py-4 bg-[#141414] text-[#E4E3E0] font-bold uppercase tracking-widest text-xs"
              >
                Cerrar Ajustes
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative bg-white overflow-hidden">
        {isSidebarOpen && (
          <div 
            className="md:hidden absolute inset-0 bg-black/20 backdrop-blur-sm z-30" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        <div className="absolute top-4 md:top-6 right-4 md:right-6 z-20 flex flex-col gap-3">
          <div className="bg-[#141414] rounded-sm shadow-2xl flex flex-col items-center overflow-hidden border border-[#E4E3E0]/20">
            <button onClick={() => handleZoom(0.5)} className="p-3 text-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors"><Plus className="w-5 h-5" /></button>
            <button onClick={() => handleZoom(2)} className="p-3 text-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors border-y border-[#E4E3E0]/10"><Minus className="w-5 h-5" /></button>
            <button onClick={resetView} className="p-3 text-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors"><RefreshCw className="w-5 h-5" /></button>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="hidden sm:block bg-white border border-[#141414] p-3 shadow-sm max-w-[180px]"
          >
              <div className="flex items-center gap-2 mb-1 text-[9px] font-bold uppercase tracking-tight">
                <Info className="w-3 h-3" /> Guía rápida
              </div>
              <p className="text-[9px] leading-tight text-[#141414]/60">
                Variable fija: <code className="font-bold">x</code>. Variables dinámicas: <code className="font-bold italic text-black">a, b, c...</code>
              </p>
          </motion.div>
        </div>

        <div className="absolute bottom-4 left-4 md:top-6 md:left-6 md:bottom-auto z-20 pointer-events-none">
          <div className="font-mono text-[9px] md:text-[11px] bg-[#141414] text-[#E4E3E0] px-3 py-1.5 shadow-lg border border-[#E4E3E0]/20">
            RANGO: X[{xRange.min.toFixed(0)}, {xRange.max.toFixed(0)}] Y[{yRange.min.toFixed(0)}, {yRange.max.toFixed(0)}]
          </div>
        </div>

        <div className="flex-1 w-full flex items-center justify-center p-2 md:p-8">
          <div className="w-full h-full bg-[#f8f7f5] rounded-xl border border-[#141414]/5 shadow-inner relative overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="1 1" stroke="#141414" opacity={0.05} />
                <XAxis dataKey="x" type="number" domain={[xRange.min, xRange.max]} hide />
                <YAxis type="number" domain={[yRange.min, yRange.max]} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141414', border: 'none', color: '#E4E3E0', fontSize: '10px', borderRadius: '0px' }}
                  itemStyle={{ color: '#E4E3E0' }} cursor={{ stroke: '#141414', strokeWidth: 0.5 }}
                />
                <ReferenceLine x={0} stroke="#141414" strokeWidth={1} opacity={0.2} />
                <ReferenceLine y={0} stroke="#141414" strokeWidth={1} opacity={0.2} />
                <Line type="monotone" dataKey="y" stroke={color} strokeWidth={thickness} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
