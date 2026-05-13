/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Settings, 
  Activity, 
  Palette, 
  Maximize2, 
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

interface Parameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export default function App() {
  const [equation, setEquation] = useState(DEFAULT_EQUATION);
  const [parameters, setParameters] = useState<Record<string, number>>({ a: 1, b: 1, c: 0 });
  const [thickness, setThickness] = useState(2);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [xRange, setXRange] = useState({ min: -10, max: 10 });
  const [yRange, setYRange] = useState({ min: -5, max: 5 });
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
        
        // Filter out non-numeric results or infinity
        if (typeof y === 'number' && isFinite(y)) {
          points.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(4)) });
        }
      }
      setError(null);
    } catch (err: any) {
      // Error handling is managed by the equation parser effect as well
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
    <div className="flex h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Sidebar Controls */}
      <aside className="w-80 border-r border-[#141414] flex flex-col h-full bg-[#E4E3E0] z-10 shrink-0 overflow-y-auto">
        <div className="p-6 border-b border-[#141414]">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5" />
            <h1 className="text-xl font-bold tracking-tight uppercase">GraphyMath</h1>
          </div>
          <p className="text-[10px] opacity-50 font-mono tracking-widest uppercase">Scientific Plotting v1.0</p>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* Function Input */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-mono opacity-50 uppercase tracking-widest italic">Función f(x)</label>
              {error && <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1">{error}</span>}
            </div>
            <div className="relative group">
              <input
                type="text"
                value={equation}
                onChange={(e) => setEquation(e.target.value)}
                className={`w-full bg-white border border-[#141414] px-4 py-3 font-mono text-lg transition-all focus:outline-none focus:ring-4 focus:ring-[#141414]/5 ${error ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                placeholder="e.g. sin(x)"
              />
              <div className="absolute top-2 right-2 opacity-20 pointer-events-none italic font-serif">y =</div>
            </div>
          </section>

          {/* Parameters */}
          {Object.keys(parameters).length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest">Parámetros</h2>
              </div>
              <div className="space-y-6">
                {Object.keys(parameters).map((p) => (
                  <div key={p} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="font-mono text-sm font-bold">{p}</span>
                      <span className="font-mono text-xs bg-[#141414] text-[#E4E3E0] px-2 py-0.5 rounded-full">{parameters[p].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.01"
                      value={parameters[p]}
                      onChange={(e) => handleParamChange(p, parseFloat(e.target.value))}
                      className="w-full accent-[#141414] h-1.5 bg-[#141414]/10 rounded-lg cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Style Controls */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-widest">Estilo Visual</h2>
            </div>
            
            {/* Color */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono opacity-50 uppercase block">Color de Línea</span>
              <div className="flex flex-wrap gap-2">
                {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#141414"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border border-[#141414]/20 transition-all hover:scale-110 flex items-center justify-center ${color === c ? 'ring-2 ring-[#141414] ring-offset-2 scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-full overflow-hidden border border-[#141414]/20 cursor-pointer hover:scale-110 transition-transform"
                />
              </div>
            </div>

            {/* Thickness */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono opacity-50 uppercase">Grosor de Línea</span>
                <span className="font-mono text-[10px] bg-[#141414]/10 px-1.5 rounded">{thickness}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={thickness}
                onChange={(e) => setThickness(parseFloat(e.target.value))}
                className="w-full accent-[#141414] h-1.5 bg-[#141414]/10 rounded-lg cursor-pointer transition-all"
              />
            </div>
          </section>
        </div>

        {/* Footer Info */}
        <div className="p-6 bg-white/50 text-[9px] font-mono uppercase tracking-tighter border-t border-[#141414]">
          <div className="flex gap-4 opacity-40 hover:opacity-100 transition-opacity">
            <span>Points: {SAMPLE_POINTS}</span>
            <span>Mode: Cartesian</span>
            <span>MathJS Engine</span>
          </div>
        </div>
      </aside>

      {/* Main Plot Area */}
      <main className="flex-1 flex flex-col relative bg-white overscroll-none">
        
        {/* Toolbar */}
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
          <div className="bg-[#141414] p-1 shadow-xl flex flex-col gap-1 items-stretch group transition-all duration-300">
            <button 
              onClick={() => handleZoom(0.5)} 
              title="Acercar"
              className="p-2 text-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleZoom(2)} 
              title="Alejar"
              className="p-2 text-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors border-y border-[#E4E3E0]/10 flex items-center justify-center"
            >
              <Minus className="w-5 h-5" />
            </button>
            <button 
              onClick={resetView} 
              title="Reiniciar Vista"
              className="p-2 text-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-white border border-[#141414] p-3 shadow-lg max-w-[200px]">
              <div className="flex items-center gap-2 mb-1 text-[10px] font-bold uppercase tracking-wider">
                <Info className="w-3 h-3" />
                Guía de Sintaxis
              </div>
              <p className="text-[10px] leading-relaxed text-[#141414]/60">
                Usa <code className="bg-[#141414]/5 px-1 font-bold">x</code> como variable. Agrega variables como <code className="bg-[#141414]/5 px-1 font-bold">a, b, c</code> para sliders automáticos.
                <br/>Funciones: <code className="bg-[#141414]/5 px-1 font-bold">sin, cos, exp, log, sqrt, abs</code>.
              </p>
          </div>
        </div>

        {/* View Range Labels */}
        <div className="absolute top-6 left-6 z-20 pointer-events-none">
          <div className="font-mono text-[11px] bg-[#141414] text-[#E4E3E0] px-3 py-1.5 shadow-lg">
            VIEWPORT: X({xRange.min.toFixed(0)}, {xRange.max.toFixed(0)}) Y({yRange.min.toFixed(0)}, {yRange.max.toFixed(0)})
          </div>
        </div>

        {/* Plot Component */}
        <div className="flex-1 w-full bg-[#E4E3E0]/20">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 40, right: 40, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#141414" opacity={0.08} vertical={true} />
              
              <XAxis 
                dataKey="x" 
                type="number" 
                domain={[xRange.min, xRange.max]} 
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                stroke="#141414"
                axisLine={{ strokeWidth: 1 }}
                tickLine={{ stroke: '#141414' }}
              />
              
              <YAxis 
                type="number" 
                domain={[yRange.min, yRange.max]} 
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                stroke="#141414"
                axisLine={{ strokeWidth: 1 }}
                tickLine={{ stroke: '#141414' }}
              />
              
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#141414', 
                  border: 'none', 
                  color: '#E4E3E0', 
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  borderRadius: '0px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
                }}
                itemStyle={{ color: '#E4E3E0' }}
                cursor={{ stroke: '#141414', strokeWidth: 1, strokeDasharray: '4 4' }}
              />

              {/* Zero Lines */}
              <ReferenceLine x={0} stroke="#141414" strokeWidth={1} opacity={0.3} />
              <ReferenceLine y={0} stroke="#141414" strokeWidth={1} opacity={0.3} />

              <Line 
                type="monotone" 
                dataKey="y" 
                stroke={color} 
                strokeWidth={thickness} 
                dot={false}
                isAnimationActive={false} // Faster updates
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
