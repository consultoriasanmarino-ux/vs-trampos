'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, Eye, EyeOff, Zap } from 'lucide-react'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })

            const data = await res.json()

            if (res.ok && data.success) {
                if (data.role === 'admin') {
                    router.push('/admin')
                } else if (data.role === 'gerente') {
                    router.push('/gerente')
                } else {
                    router.push('/ligador')
                }
            } else {
                setError(data.error || 'Credenciais inválidas.')
            }
        } catch {
            setError('Erro de conexão com o servidor.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-grid opacity-30" />
            <div className="orb w-[500px] h-[500px] -top-32 -right-32 opacity-20" style={{ background: 'rgba(124, 58, 237, 0.3)' }} />
            <div className="orb w-[400px] h-[400px] -bottom-32 -left-32 opacity-15 animate-pulse-glow" style={{ background: 'rgba(124, 58, 237, 0.2)' }} />

            {[...Array(5)].map((_, i) => (
                <div
                    key={i}
                    className="absolute rounded-full animate-float"
                    style={{
                        width: `${3 + i}px`,
                        height: `${3 + i}px`,
                        background: `rgba(124, 58, 237, ${0.15 + i * 0.05})`,
                        top: `${20 + i * 15}%`,
                        left: `${15 + i * 16}%`,
                        animationDelay: `${i * 2}s`,
                        animationDuration: `${7 + i * 2}s`,
                    }}
                />
            ))}

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-violet-600/20 animate-pulse-glow bg-gradient-to-br from-violet-600/30 to-purple-700/20 border border-violet-500/20">
                        <Zap className="w-10 h-10 text-violet-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">VS Trampos</h1>
                    <p className="text-gray-600 text-xs mt-1 uppercase tracking-[0.2em] font-medium">Sistema de Gestão de Leads</p>
                </div>

                {/* Card */}
                <div className="glass-strong rounded-2xl p-7">
                    <h2 className="text-base font-semibold text-white mb-5">Entrar na sua conta</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Usuário</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-gray-600 group-focus-within:text-violet-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-transparent transition-all text-sm"
                                    placeholder="Digite seu usuário"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-600 group-focus-within:text-violet-500 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-12 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-transparent transition-all text-sm"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-600 hover:text-gray-400 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 animate-fade-in-up">
                                <p className="text-red-400 text-xs font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-600/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm relative overflow-hidden"
                        >
                            <div className="absolute inset-0 animate-shimmer" />
                            <span className="relative">
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Entrando...
                                    </span>
                                ) : (
                                    'Entrar no Sistema'
                                )}
                            </span>
                        </button>
                    </form>

                    <div className="mt-5 pt-4 border-t border-white/[0.04] text-center">
                        <p className="text-[9px] text-gray-700 uppercase tracking-[0.2em] font-medium">Acesso Restrito • VS Trampos</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
