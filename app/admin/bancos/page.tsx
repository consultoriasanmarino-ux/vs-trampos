'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Landmark, Pencil, X, Check, Palette } from 'lucide-react'
import { supabase, Banco } from '@/lib/supabase'
import { useBankTheme, COLOR_PALETTE } from '@/lib/bank-theme'

export default function BancosPage() {
    const { theme } = useBankTheme()
    const [bancos, setBancos] = useState<Banco[]>([])
    const [novoBanco, setNovoBanco] = useState('')
    const [novaCor, setNovaCor] = useState('#FF6600')
    const [loading, setLoading] = useState(false)
    const [editandoId, setEditandoId] = useState<string | null>(null)
    const [editandoNome, setEditandoNome] = useState('')
    const [editandoCor, setEditandoCor] = useState('')

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
        const { error } = await supabase.from('bancos').insert({ nome: novoBanco.trim(), cor: novaCor })
        if (!error) {
            setNovoBanco('')
            setNovaCor('#FF6600')
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
        const { error } = await supabase.from('bancos').update({ nome: editandoNome.trim(), cor: editandoCor }).eq('id', id)
        if (!error) {
            setEditandoId(null)
            setEditandoNome('')
            setEditandoCor('')
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
            <div className="glass rounded-2xl p-6 mb-8 animate-fade-in-up stagger-1">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <Plus size={16} style={{ color: theme.primary }} />
                    Novo Banco
                </h2>
                <form onSubmit={adicionarBanco} className="space-y-4">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={novoBanco}
                            onChange={(e) => setNovoBanco(e.target.value)}
                            placeholder="Nome do banco (ex: Itaú, Bradesco, PAN)"
                            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                            style={{ '--tw-ring-color': `rgba(${theme.primaryRGB}, 0.4)` } as React.CSSProperties}
                        />
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                            <Palette size={12} /> Cor do Banco
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_PALETTE.map((color) => (
                                <button
                                    key={color.hex}
                                    type="button"
                                    onClick={() => setNovaCor(color.hex)}
                                    className={`w-8 h-8 rounded-lg transition-all duration-200 border-2 hover:scale-110 ${novaCor === color.hex
                                            ? 'border-white scale-110 shadow-lg'
                                            : 'border-transparent'
                                        }`}
                                    style={{ background: color.hex }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <div className="w-5 h-5 rounded-md border border-white/10" style={{ background: novaCor }} />
                            <span className="text-xs text-gray-500 font-mono">{novaCor}</span>
                            <span className="text-xs text-gray-600">— {COLOR_PALETTE.find(c => c.hex === novaCor)?.name || 'Personalizada'}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !novoBanco.trim()}
                        className="flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl active:scale-[0.98] transition-all disabled:opacity-40 text-sm relative overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}cc)`,
                            boxShadow: `0 4px 20px rgba(${theme.primaryRGB}, 0.25)`,
                        }}
                    >
                        <div className="absolute inset-0 animate-shimmer" />
                        <span className="relative flex items-center gap-2">
                            <Plus size={16} />
                            Cadastrar Banco
                        </span>
                    </button>
                </form>
            </div>

            {/* Lista */}
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
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-2">
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
                                    {/* Color edit */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {COLOR_PALETTE.map((color) => (
                                            <button
                                                key={color.hex}
                                                type="button"
                                                onClick={() => setEditandoCor(color.hex)}
                                                className={`w-6 h-6 rounded-md transition-all duration-200 border-2 hover:scale-110 ${editandoCor === color.hex
                                                        ? 'border-white scale-110'
                                                        : 'border-transparent'
                                                    }`}
                                                style={{ background: color.hex }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full border border-white/10 shrink-0"
                                            style={{ background: banco.cor || '#7c3aed' }}
                                        />
                                        <span className="text-white text-sm font-medium">{banco.nome}</span>
                                        <span className="text-[10px] text-gray-700 font-mono">{banco.cor || '#7c3aed'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditandoId(banco.id); setEditandoNome(banco.nome); setEditandoCor(banco.cor || '#7c3aed') }}
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
