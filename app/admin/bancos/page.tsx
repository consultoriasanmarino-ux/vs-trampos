'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Landmark, Pencil, X, Check } from 'lucide-react'
import { supabase, Banco } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function BancosPage() {
    const { theme } = useBankTheme()
    const [bancos, setBancos] = useState<Banco[]>([])
    const [novoBanco, setNovoBanco] = useState('')
    const [loading, setLoading] = useState(false)
    const [editandoId, setEditandoId] = useState<string | null>(null)
    const [editandoNome, setEditandoNome] = useState('')

    useEffect(() => {
        carregarBancos()
    }, [])

    const carregarBancos = async () => {
        const { data } = await supabase.from('bancos').select('*').order('nome')
        if (data) setBancos(data)
    }

    const adicionarBanco = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!novoBanco.trim()) return

        setLoading(true)
        const { error } = await supabase.from('bancos').insert({ nome: novoBanco.trim() })
        if (!error) {
            setNovoBanco('')
            carregarBancos()
        }
        setLoading(false)
    }

    const deletarBanco = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este banco?')) return
        const { error } = await supabase.from('bancos').delete().eq('id', id)
        if (!error) carregarBancos()
    }

    const salvarEdicao = async (id: string) => {
        if (!editandoNome.trim()) return
        const { error } = await supabase.from('bancos').update({ nome: editandoNome.trim() }).eq('id', id)
        if (!error) {
            setEditandoId(null)
            setEditandoNome('')
            carregarBancos()
        }
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-white tracking-tight">Bancos</h1>
                <p className="text-gray-600 text-sm mt-1">Cadastre e gerencie os bancos disponíveis.</p>
            </div>

            {/* Adicionar */}
            <form onSubmit={adicionarBanco} className="flex gap-3 mb-8 animate-fade-in-up stagger-1">
                <input
                    type="text"
                    value={novoBanco}
                    onChange={(e) => setNovoBanco(e.target.value)}
                    placeholder="Nome do banco (ex: Itaú, Bradesco, PAN)"
                    className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{ '--tw-ring-color': `rgba(${theme.primaryRGB}, 0.4)` } as any}
                />
                <button
                    type="submit"
                    disabled={loading || !novoBanco.trim()}
                    className="flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl active:scale-[0.98] transition-all disabled:opacity-40 text-sm"
                    style={{
                        background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}cc)`,
                        boxShadow: `0 4px 20px rgba(${theme.primaryRGB}, 0.25)`,
                    }}
                >
                    <Plus size={16} />
                    Adicionar
                </button>
            </form>

            <div className="space-y-2">
                {bancos.length === 0 ? (
                    <div className="text-center py-16 glass rounded-2xl animate-fade-in">
                        <Landmark className="mx-auto text-gray-800 mb-3" size={48} />
                        <p className="text-gray-600 text-sm">Nenhum banco cadastrado ainda.</p>
                    </div>
                ) : (
                    bancos.map((banco, i) => (
                        <div
                            key={banco.id}
                            className="flex items-center justify-between glass rounded-xl px-5 py-4 group card-hover animate-fade-in-up"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            {editandoId === banco.id ? (
                                <div className="flex items-center gap-2 flex-1 mr-3">
                                    <input
                                        type="text"
                                        value={editandoNome}
                                        onChange={(e) => setEditandoNome(e.target.value)}
                                        className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') salvarEdicao(banco.id); if (e.key === 'Escape') setEditandoId(null) }}
                                    />
                                    <button onClick={() => salvarEdicao(banco.id)} className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors">
                                        <Check size={16} />
                                    </button>
                                    <button onClick={() => setEditandoId(null)} className="p-2 text-gray-500 hover:bg-white/[0.05] rounded-lg transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg transition-all duration-500" style={{ background: `rgba(${theme.primaryRGB}, 0.1)` }}>
                                            <Landmark size={16} style={{ color: theme.primary }} />
                                        </div>
                                        <span className="text-white text-sm font-medium">{banco.nome}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditandoId(banco.id); setEditandoNome(banco.nome) }}
                                            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => deletarBanco(banco.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
