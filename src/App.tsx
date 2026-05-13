/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, WheelEvent, useRef, MouseEvent, TouchEvent } from 'react';
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
  RefreshCw,
  Move
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

  // Interaction State
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [touchDist, setTouchDist] = useState<number | null>(null);

  // --- Zoom Logic (Wheel) ---
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const factor = e.deltaY > 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
    zoom(factor);
  };

  const zoom = (factor: number) => {
    setXRange(prev => ({ 
      min: prev.min * factor, 
      max: prev.max * factor 
    }));
    setYRange(prev => ({ 
      min: prev.min * factor, 
      max: prev.max * factor 
    }));
  };

  // --- Pan Logic ---
  const startPanning = (x: number, y: number) => {
    setIsPanning(true);
    setLastMousePos({ x, y });
  };

  const stopPanning = () => {
    setIsPanning(false);
    setTouchDist(null);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPanning) return;
    pan(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      if (!isPanning) return;
      pan(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchDist !== null) {
        const factor = touchDist / d;
        zoom(factor);
      }
      setTouchDist(d);
    }
  };

  const pan = (currentX: number, currentY: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const dx = currentX - lastMousePos.x;
    const dy = currentY - lastMousePos.y;

    const xSpan = xRange.max - xRange.min;
    const ySpan = yRange.max - yRange.min;

    // Convert pixel movement to graph units
    const xMove = (dx / rect.width) * xSpan;
    const yMove = (dy / rect.height) * ySpan;

    setXRange(prev => ({ min: prev.min - xMove, max: prev.max - xMove }));
    setYRange(prev => ({ min: prev.min + yMove, max: prev.max + yMove }));
    setLastMousePos({ x: currentX, y: currentY });
  };

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

  const resetView = () => {
    setXRange({ min: -10, max: 10 });
    setYRange({ min: -5, max: 5 });
  };

  return (
    <div className="flex h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] overflow-hidden relative">
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-6 left-6 z-50 p-4 bg-[#141414] text-[#E4E3E0] rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
        title="Abrir ajustes"
      >
        <AnimatePresence mode="wait">
          {isSidebarOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <Plus className="w-6 h-6 rotate-45" />
            </motion.div>
          ) : (
            <motion.div key="settings" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Settings2 className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Sidebar Overlay/Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 cursor-pointer"
            />
            
            {/* Drawer Content */}
            <motion.aside 
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              exit={{ x: -400 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-full max-w-sm bg-[#E4E3E0] border-r border-[#141414] flex flex-col h-full z-50 shadow-2xl overflow-y-auto"
            >
              <div className="p-8 pb-4 border-b border-[#141414]/10">
                <div className="flex items-center gap-3 mb-1">
                  <Activity className="w-6 h-6" />
                  <h1 className="text-xl font-black uppercase tracking-tight">GraphyMath</h1>
                </div>
                <p className="text-[10px] opacity-50 font-mono tracking-widest uppercase">Scientific Plotting v1.2</p>
              </div>

              <div className="p-8 space-y-10 flex-1">
                {/* Function Input */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[11px] font-mono opacity-60 uppercase tracking-widest italic">Expresión f(x)</label>
                    {error && <span className="text-[10px] text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-sm">{error}</span>}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={equation}
                      onChange={(e) => setEquation(e.target.value)}
                      className={`w-full bg-white border-2 border-[#141414] px-5 py-4 font-mono text-xl transition-all focus:outline-none focus:ring-8 focus:ring-[#141414]/5 ${error ? 'border-red-500 ring-red-500/10' : ''}`}
                      placeholder="e.g. a * x^2"
                    />
                    <div className="absolute top-4 right-4 opacity-20 pointer-events-none italic font-serif">y=</div>
                  </div>
                </section>

                {/* Parameters */}
                {Object.keys(parameters).length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <Settings2 className="w-4 h-4 opacity-60" />
                      <h2 className="text-xs font-black uppercase tracking-widest">Ajustes Dinámicos</h2>
                    </div>
                    <div className="space-y-8">
                      {Object.keys(parameters).map((p) => (
                        <div key={p} className="space-y-4">
                          <div className="flex justify-between items-center px-1">
                            <span className="font-mono text-sm font-black text-[#141414]/80">{p}</span>
                            <span className="font-mono text-[11px] bg-[#141414] text-[#E4E3E0] px-3 py-1 rounded-sm">{parameters[p].toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="-10"
                            max="10"
                            step="0.01"
                            value={parameters[p]}
                            onChange={(e) => handleParamChange(p, parseFloat(e.target.value))}
                            className="w-full h-2 bg-[#141414]/10 rounded-lg appearance-none cursor-pointer accent-[#141414] progress-range"
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Style */}
                <section className="pt-8 border-t border-[#141414]/10 space-y-8">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 opacity-60" />
                    <h2 className="text-xs font-black uppercase tracking-widest">Preferencias Visuales</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <span className="text-[10px] font-mono opacity-50 uppercase block tracking-widest">Color de trazo</span>
                    <div className="grid grid-cols-6 gap-3">
                      {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#141414"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className={`aspect-square rounded-full border-2 transition-all hover:scale-110 ${color === c ? 'border-[#141414] scale-125 shadow-lg' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Grosor de línea</span>
                      <span className="font-mono text-[11px] font-bold">{thickness}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={thickness}
                      onChange={(e) => setThickness(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#141414]/10 rounded-lg appearance-none cursor-pointer accent-[#141414]"
                    />
                  </div>
                </section>
              </div>

              <div className="p-8">
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-full py-5 bg-[#141414] text-[#E4E3E0] font-black uppercase tracking-[0.2em] text-xs hover:bg-[#2a2a2a] transition-colors shadow-2xl active:scale-[0.98]"
                >
                  Continuar
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Plot Area */}
      <main 
        ref={containerRef}
        className={`flex-1 flex flex-col relative bg-white overflow-hidden scroll-none select-none touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        onWheel={handleWheel}
        onMouseDown={(e) => {
          // Pan only with middle button (1) per user request, but standard mouse drag (0) also often useful. 
          // Rule said "si aprieto la rueda del ratón pueda arrastrar".
          if (e.button === 1 || e.button === 0) {
            startPanning(e.clientX, e.clientY);
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={stopPanning}
        onMouseLeave={stopPanning}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            startPanning(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopPanning}
      >
        {/* Interaction Info Tips */}
        <div className="absolute top-6 right-6 z-20 pointer-events-none flex flex-col items-end gap-2">
          <div className="font-mono text-[9px] bg-[#141414] text-[#E4E3E0] px-3 py-1.5 shadow-xl border border-[#E4E3E0]/20 flex items-center gap-2">
            <RefreshCw className="w-3 h-3 animate-spin-slow opacity-50" />
            <span>ZOOM: RUEDA / PELLIZCO</span>
          </div>
          <div className="font-mono text-[9px] bg-[#141414] text-[#E4E3E0] px-3 py-1.5 shadow-xl border border-[#E4E3E0]/20 flex items-center gap-2">
            <Move className="w-3 h-3 opacity-50" />
            <span>PAN: ARRASTRAR / RUEDA CLIC</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
           <button 
             onClick={resetView}
             className="p-4 bg-[#141414] text-[#E4E3E0] rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
           >
             <RefreshCw className="w-4 h-4" />
             <span className="hidden sm:inline">RECÉNTRAR</span>
           </button>
        </div>

        {/* Viewport Range Tag */}
        <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
          <div className="font-mono text-[9px] md:text-[11px] bg-[#141414]/10 text-[#141414] px-4 py-2 border border-[#141414]/10 backdrop-blur-md">
            X[{xRange.min.toFixed(1)}, {xRange.max.toFixed(1)}] • Y[{yRange.min.toFixed(1)}, {yRange.max.toFixed(1)}]
          </div>
        </div>

        {/* Full-Screen Plot Graph */}
        <div className="flex-1 w-full bg-[#fcfbf9] relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="1 1" stroke="#141414" opacity={0.03} />
              <XAxis dataKey="x" type="number" domain={[xRange.min, xRange.max]} hide />
              <YAxis type="number" domain={[yRange.min, yRange.max]} hide />
              
              <ReferenceLine x={0} stroke="#141414" strokeWidth={1} opacity={0.15} />
              <ReferenceLine y={0} stroke="#141414" strokeWidth={1} opacity={0.15} />
              
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke={color} 
                strokeWidth={thickness} 
                dot={false} 
                isAnimationActive={false} 
                strokeLinecap="round"
                connectNulls={false}
              />
              
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#141414', 
                  border: 'none', 
                  color: '#E4E3E0', 
                  fontSize: '11px', 
                  fontFamily: 'monospace',
                  padding: '12px',
                  borderRadius: '0px',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
                }}
                itemStyle={{ color: '#E4E3E0' }} 
                cursor={{ stroke: '#141414', strokeWidth: 0.5, strokeDasharray: '3 3' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}

