import { useState, FormEvent } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceMessage?: string | null;
}

export default function AuthModal({ isOpen, onClose, forceMessage }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update display name
        await updateProfile(user, { displayName: username });

        // Create user doc
        try {
          await setDoc(doc(db, 'users', user.uid), {
            username,
            email,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }

        // Send verification email
        await sendEmailVerification(user);
        alert('Se ha enviado un correo de confirmación. Por favor revisa tu bandeja de entrada.');
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#E4E3E0] border-2 border-[#141414] w-full max-w-md overflow-hidden relative shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">
                {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
              </h2>
              {forceMessage && (
                <p className="text-xs font-bold text-red-600 mt-1 uppercase tracking-widest">{forceMessage}</p>
              )}
            </div>
            {!forceMessage && (
              <button onClick={onClose} className="p-1 hover:bg-[#141414]/10 transition-colors">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Nombre de Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 opacity-40" />
                  <input
                    required
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white border-2 border-[#141414] pl-10 pr-4 py-2.5 font-mono text-sm focus:outline-none"
                    placeholder="Tu nick"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 opacity-40" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border-2 border-[#141414] pl-10 pr-4 py-2.5 font-mono text-sm focus:outline-none"
                  placeholder="ejemplo@google.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 opacity-40" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border-2 border-[#141414] pl-10 pr-4 py-2.5 font-mono text-sm focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-[10px] text-red-600 font-bold uppercase">{error}</p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-[#141414] text-[#E4E3E0] font-black uppercase tracking-[0.2em] text-xs hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? 'Entrar' : 'Completar Registro')}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[#141414]/10 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-black uppercase tracking-widest hover:underline"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
