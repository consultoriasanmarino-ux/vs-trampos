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
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">VS Trampos</h1>
                    <p className="text-gray-500 mt-1 text-sm">Sistema de Gestão de Leads</p>
                </div>

                {/* Card */}
                <div className="bg-[#0c0c0c] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold text-white mb-6">Entrar na sua conta</h2>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Username */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Usuário</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition-all text-sm"
                                    placeholder="Digite seu usuário"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-12 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition-all text-sm"
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

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
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
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-white/[0.04] text-center">
                        <p className="text-[10px] text-gray-700 uppercase tracking-[0.2em] font-medium">Acesso Restrito • VS Trampos</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
