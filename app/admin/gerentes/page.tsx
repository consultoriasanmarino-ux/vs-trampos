'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Shield, Eye, EyeOff } from 'lucide-react'
import { supabase, Gerente } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function GerentesPage() {
    const { theme } = useBankTheme()
    const [gerentes, setGerentes] = useState<Gerente[]>([])
    const [nome, setNome] = useState('')
    const [login, setLogin] = useState('')
    const [senha, setSenha] = useState('')
    const [loading, setLoading] = useState(false)
    const [showSenha, setShowSenha] = useState(false)

    useEffect(() => { carregarGerentes() }, [])

    const carregarGerentes = async () => {
        const { data } = await supabase.from('gerentes').select('*').order('nome')
        if (data) setGerentes(data)
    }

    const criarGerente = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nome.trim() || !login.trim() || !senha.trim()) return
        setLoading(true)
        const { error } = await supabase.from('gerentes').insert({ nome: nome.trim(), login: login.trim(), senha_hash: senha })
        if (error) {
            alert('Erro ao criar gerente: ' + error.message)
        } else {
            setNome(''); setLogin(''); setSenha(''); carregarGerentes()
        }
        setLoading(false)
    }

    const deletarGerente = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este gerente?')) return
        await supabase.from('gerentes').delete().eq('id', id)
        carregarGerentes()
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-white tracking-tight">Gerentes</h1>
                <p className="text-gray-600 text-sm mt-1">Cadastre e gerencie os gerentes do sistema. Eles podem atribuir fichas, criar ligadores e acompanhar desempenho.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-1">
                    <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                        <Shield size={18} style={{ color: theme.primary }} /> Novo Gerente
                    </h2>
                    <form onSubmit={criarGerente} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
                            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Carlos Mendes"
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                                style={{ '--tw-ring-color': `rgba(${theme.primaryRGB}, 0.4)` } as any} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Login</label>
                            <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Ex: carlos.mendes"
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all font-mono"
                                style={{ '--tw-ring-color': `rgba(${theme.primaryRGB}, 0.4)` } as any} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Senha</label>
                            <div className="relative">
                                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••"
                                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                                    style={{ '--tw-ring-color': `rgba(${theme.primaryRGB}, 0.4)` } as any} required />
                                <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full text-white font-semibold py-3 rounded-xl active:scale-[0.98] transition-all disabled:opacity-40 text-sm relative overflow-hidden"
                            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}cc)`, boxShadow: `0 4px 20px rgba(${theme.primaryRGB}, 0.25)` }}>
                            <div className="absolute inset-0 animate-shimmer" />
                            <span className="relative flex items-center justify-center gap-2">
                                <Plus size={16} />
                                {loading ? 'Cadastrando...' : 'Cadastrar Gerente'}
                            </span>
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-2">
                    {gerentes.length === 0 ? (
                        <div className="text-center py-16 glass rounded-2xl animate-fade-in">
                            <Shield className="mx-auto text-gray-800 mb-3" size={48} />
                            <p className="text-gray-600 text-sm">Nenhum gerente cadastrado.</p>
                            <p className="text-gray-700 text-xs mt-1">Crie o primeiro gerente ao lado.</p>
                        </div>
                    ) : (
                        gerentes.map((ger, i) => (
                            <div key={ger.id}
                                className="flex items-center justify-between glass rounded-xl px-5 py-4 group card-hover animate-fade-in-up"
                                style={{ animationDelay: `${i * 0.05}s` }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.04] transition-all duration-500"
                                        style={{ background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.2), rgba(${theme.primaryRGB}, 0.05))` }}>
                                        <span className="text-sm font-bold" style={{ color: theme.primary }}>{ger.nome.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{ger.nome}</p>
                                        <p className="text-xs text-gray-600 font-mono">@{ger.login}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-bold text-amber-500/60 uppercase tracking-wider px-2 py-1 bg-amber-500/5 rounded-lg border border-amber-500/10">Gerente</span>
                                    <button onClick={() => deletarGerente(ger.id)}
                                        className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
