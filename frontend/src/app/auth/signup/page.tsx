"use client"

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Brain, Heart, Sparkles, AlertCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/actions';

export default function SignUpPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validate inputs
        if (!name || !email || !password || !confirmPassword) {
            setError('Todos los campos son requeridos');
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            setIsLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            setIsLoading(false);
            return;
        }

        if (password.length > 72) {
            setError('La contraseña debe tener máximo 72 caracteres');
            setIsLoading(false);
            return;
        }

        try {
            // Register via server action
            await registerUser(email, name, password);
            setSuccess(true);

            // Automatically sign in
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.ok) {
                router.push('/');
            } else {
                setError('Error al iniciar sesión. Por favor, intenta de nuevo.');
            }
        } catch (err: any) {
            setError(err.message || 'Error en el registro. Intenta de nuevo.');
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4 relative overflow-hidden">
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
                {/* Header */}
                <div className="flex justify-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="relative"
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-300/50">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <Sparkles className="w-5 h-5 text-amber-400 absolute -top-2 -right-2 animate-spin" style={{ animationDuration: '3s' }} />
                    </motion.div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                    CogniCare
                </h1>
                <p className="text-gray-600 mb-8">Crea tu cuenta</p>

                {/* Form */}
                <form onSubmit={handleSignUp} className="space-y-4">
                    {/* Name Input */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <input
                            type="text"
                            placeholder="Nombre completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-6 py-3 bg-white/50 border border-blue-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder-gray-400"
                            disabled={isLoading}
                        />
                    </motion.div>

                    {/* Email Input */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <input
                            type="email"
                            placeholder="Tu correo"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-6 py-3 bg-white/50 border border-blue-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder-gray-400"
                            disabled={isLoading}
                        />
                    </motion.div>

                    {/* Password Input */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <input
                            type="password"
                            placeholder="Contraseña (mín. 8 caracteres)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-6 py-3 bg-white/50 border border-blue-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder-gray-400"
                            disabled={isLoading}
                        />
                    </motion.div>

                    {/* Confirm Password Input */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                        <input
                            type="password"
                            placeholder="Confirma tu contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-6 py-3 bg-white/50 border border-blue-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder-gray-400"
                            disabled={isLoading}
                        />
                    </motion.div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3"
                        >
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </motion.div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-3"
                        >
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-green-700">¡Registro exitoso! Iniciando sesión...</p>
                        </motion.div>
                    )}

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-300/50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Registrando...
                            </>
                        ) : (
                            <>
                                <Heart className="w-5 h-5" />
                                Crear cuenta
                            </>
                        )}
                    </motion.button>
                </form>

                {/* Divider */}
                <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="px-3 text-gray-500 text-sm">¿Ya tienes cuenta?</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* Sign In Link */}
                <Link
                    href="/auth/signin"
                    className="block w-full text-center text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                    Inicia sesión aquí
                </Link>
            </motion.div>
        </main>
    );
}
