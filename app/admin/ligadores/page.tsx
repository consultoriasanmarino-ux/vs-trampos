'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, UserCog, Eye, EyeOff } from 'lucide-react'
import { supabase, Ligador } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function LigadoresPage() {
    const { theme } = useBankTheme()
    const [ligadores, setLigadores] = useState<Ligador[]>([])
    const [nome, setNome] = useState('')
    const [login, setLogin] = useState('')
    const [senha, setSenha] = useState('')
    const [loading, setLoading] = useState(false)
    const [showSenha, setShowSenha] = useState(false)

    useEffect(() => { carregarLigadores() }, [])

    const carregarLigadores = async () => {
        const { data } = await supabase.from('ligadores').select('*').order('nome')
        if (data) setLigadores(data)
    }

    const criarLigador = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nome.trim() || !login.trim() || !senha.trim()) return
        setLoading(true)
        const { error } = await supabase.from('ligadores').insert({ nome: nome.trim(), login: login.trim(), senha_hash: senha })
        if (!error) { setNome(''); setLogin(''); setSenha(''); carregarLigadores() }
        setLoading(false)
    }

    const deletarLigador = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este ligador?')) return
        await supabase.from('ligadores').delete().eq('id', id)
        carregarLigadores()
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-white tracking-tight">Ligadores</h1>
                <p className="text-gray-600 text-sm mt-1">Cadastre e gerencie os operadores do sistema.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-1">
                    <h2 className="text-base font-semibold text-white mb-5">Novo Ligador</h2>
                    <form onSubmit={criarLigador} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
                            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva"
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                                style={{ '--tw-ring-color': `rgba(${theme.primaryRGB}, 0.4)` } as any} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Login</label>
                            <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Ex: joao.silva"
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
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
                                {loading ? 'Cadastrando...' : 'Cadastrar Ligador'}
                            </span>
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-2">
                    {ligadores.length === 0 ? (
                        <div className="text-center py-16 glass rounded-2xl animate-fade-in">
                            <UserCog className="mx-auto text-gray-800 mb-3" size={48} />
                            <p className="text-gray-600 text-sm">Nenhum ligador cadastrado.</p>
                        </div>
                    ) : (
                        ligadores.map((lig, i) => (
                            <div key={lig.id}
                                className="flex items-center justify-between glass rounded-xl px-5 py-4 group card-hover animate-fade-in-up"
                                style={{ animationDelay: `${i * 0.05}s` }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.04] transition-all duration-500"
                                        style={{ background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.2), rgba(${theme.primaryRGB}, 0.05))` }}>
                                        <span className="text-sm font-bold" style={{ color: theme.primary }}>{lig.nome.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{lig.nome}</p>
                                        <p className="text-xs text-gray-600 font-mono">@{lig.login}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`/admin/fichas?ligadorId=${lig.id}`}
                                        className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/btn"
                                        title="Ver Fichas deste Ligador"
                                    >
                                        <Eye size={14} className="group-hover/btn:text-emerald-400" />
                                        <span className="hidden sm:inline">Fichas</span>
                                    </a>
                                    <button onClick={() => deletarLigador(lig.id)}
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
