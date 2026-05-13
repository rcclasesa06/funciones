import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Star, TrendingUp, X } from 'lucide-react';

interface PopularFunctionsProps {
  onSelect: (eq: string) => void;
}

export default function PopularFunctions({ onSelect }: PopularFunctionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [functions, setFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPopular = async () => {
    setLoading(true);
    const path = 'popular_functions';
    try {
      const q = query(
        collection(db, path), 
        orderBy('useCount', 'desc'), 
        limit(5)
      );
      const snapshot = await getDocs(q);
      setFunctions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPopular();
    }
  }, [isOpen]);

  return (
    <div className="fixed top-24 right-6 z-[60]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border-2 border-[#141414] p-3 shadow-xl hover:scale-105 transition-all flex items-center gap-2 group"
      >
        <TrendingUp className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Top Funciones</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-16 right-0 w-64 bg-[#E4E3E0] border-2 border-[#141414] shadow-2xl p-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Star className="w-3 h-3 fill-yellow-400 stroke-yellow-400" />
                Populares
              </h3>
              <button onClick={() => setIsOpen(false)} className="opacity-40 hover:opacity-100"><X className="w-3 h-3" /></button>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="py-8 text-center animate-pulse text-[9px] font-mono">CARGANDO...</div>
              ) : functions.length === 0 ? (
                <div className="py-8 text-center text-[9px] font-mono opacity-40 italic">NADA AÚN</div>
              ) : (
                functions.map((f: any) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onSelect(f.equation);
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors border border-[#141414]/10 group flex justify-between items-center"
                  >
                    <code className="text-xs font-bold truncate pr-2">{f.equation}</code>
                    <span className="text-[8px] font-mono opacity-50 group-hover:opacity-100">{f.useCount}x</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
