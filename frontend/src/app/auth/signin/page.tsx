"use client"

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Key, ArrowLeft, Heart, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { isAzureConfigured } from '@/lib/actions';

export default function SignInPage() {
  const [configReady, setConfigReady] = useState<boolean | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    isAzureConfigured().then(setConfigReady);
  }, []);

  const handleSignIn = () => {
    if (configReady === true) {
      signIn('azure-ad', { callbackUrl: '/' });
    } else {
      setShowError(true);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 sky-bg overflow-hidden translate-z-0">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#A5D8FF]/20">
        <div className="cloud w-64 h-24 top-[10%] left-[5%] animate-float" />
        <div className="cloud w-96 h-32 bottom-[10%] right-[10%] animate-float" style={{ animationDelay: '-8s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-lg bg-white/80 backdrop-blur-2xl rounded-[3.5rem] p-8 md:p-14 border border-white/60 calm-shadow text-center relative"
      >
        <AnimatePresence>
          {showError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md rounded-[3.5rem] p-10 flex flex-col items-center justify-center border-2 border-orange-200"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-2xl font-black text-[#2C3E50] mb-4">Configuración Pendiente</h2>
              <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                Para &quot;vincular&quot; CogniCare con Azure AD, necesitas añadir el **Client ID** y el **Secret** en tu archivo `.env.local`. 
                <br /><br />
                Sin estas llaves, no podemos conectar con la base de datos ni con tu perfil de Microsoft.
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => setShowError(false)}
                  className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl interactive-element shadow-lg shadow-orange-100"
                >
                  Entendido
                </button>
                <Link 
                  href="/"
                  className="w-full py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl interactive-element text-sm"
                >
                  Regresar al Home
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-10 relative inline-block">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center border-2 border-white/50 calm-shadow">
            <Brain className="w-12 h-12 text-blue-600" />
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 5 }}
            className="absolute -top-2 -right-2 bg-white p-1.5 rounded-full calm-shadow"
          >
            <Sparkles className="w-4 h-4 text-orange-400" />
          </motion.div>
        </div>

        <h1 className="text-3xl font-black text-[#2C3E50] mb-3 tracking-tight">¡Hola! Qué bueno verte</h1>
        <p className="text-base text-gray-600 mb-10 font-medium px-4 leading-relaxed">Logremos que tu día sea más fácil, paso a paso.</p>

        <div className="space-y-6">
          <button
            onClick={handleSignIn}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] flex items-center justify-center gap-4 text-xl font-black transition-all interactive-element shadow-xl shadow-blue-200 group relative overflow-hidden"
          >
            <Key className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            <span>Conectar ahora</span>
            {configReady === false && <span className="absolute top-0 right-0 bg-orange-500 text-[8px] px-2 py-1 rounded-bl-lg font-black uppercase tracking-tighter">Local Mode</span>}
          </button>
        </div>
      </motion.div>
      
      <p className="mt-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] opacity-60">
        Espacio Seguro · CogniCare 🧠
      </p>
    </main>
  );
}
