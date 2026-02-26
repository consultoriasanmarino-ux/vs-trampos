'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Landmark, Pencil, X, Check } from 'lucide-react'
import { supabase, Banco } from '@/lib/supabase'

export default function BancosPage() {
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
        <div className="p-8">
            <div className="mb-10">
                <h1 className="text-2xl font-bold text-white tracking-tight">Bancos</h1>
                <p className="text-gray-600 text-sm mt-1">Cadastre e gerencie os bancos disponíveis.</p>
            </div>

            {/* Adicionar Banco */}
            <form onSubmit={adicionarBanco} className="flex gap-3 mb-8">
                <input
                    type="text"
                    value={novoBanco}
                    onChange={(e) => setNovoBanco(e.target.value)}
                    placeholder="Nome do banco (ex: Itaú, Bradesco, PAN)"
                    className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <button
                    type="submit"
                    disabled={loading || !novoBanco.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-40 text-sm"
                >
                    <Plus size={16} />
                    Adicionar
                </button>
            </form>

            {/* Lista de Bancos */}
            <div className="space-y-2">
                {bancos.length === 0 ? (
                    <div className="text-center py-16">
                        <Landmark className="mx-auto text-gray-800 mb-3" size={48} />
                        <p className="text-gray-600 text-sm">Nenhum banco cadastrado ainda.</p>
                    </div>
                ) : (
                    bancos.map((banco) => (
                        <div
                            key={banco.id}
                            className="flex items-center justify-between bg-[#0a0a0a] border border-white/[0.04] rounded-xl px-5 py-4 group hover:border-white/[0.08] transition-all"
                        >
                            {editandoId === banco.id ? (
                                <div className="flex items-center gap-2 flex-1 mr-3">
                                    <input
                                        type="text"
                                        value={editandoNome}
                                        onChange={(e) => setEditandoNome(e.target.value)}
                                        className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Landmark className="text-blue-500" size={16} />
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
