'use client'

import { useState, useEffect } from 'react'
import {
    Users, Search, Smartphone, Phone, AlertTriangle,
    CreditCard, TrendingUp, Star, Landmark, Zap, Lock
} from 'lucide-react'
import { supabase, Cliente, Banco } from '@/lib/supabase'
import { getThemeForBank } from '@/lib/bank-theme'

export default function LigadorPage() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [bancos, setBancos] = useState<Banco[]>([])
    const [bancosComFichas, setBancosComFichas] = useState<Set<string>>(new Set())
    const [bancoSelecionado, setBancoSelecionado] = useState<Banco | null>(null)
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingBancos, setLoadingBancos] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    // Pegar o ID do ligador do cookie
    useEffect(() => {
        const cookies = document.cookie.split(';').map(c => c.trim())
        const userCookie = cookies.find(c => c.startsWith('vs_user_id='))
        if (userCookie) {
            setUserId(userCookie.split('=')[1])
        }
    }, [])

    // Carregar bancos e verificar quais têm fichas atribuídas
    useEffect(() => {
        if (!userId) return
        carregarBancos()
    }, [userId])

    const carregarBancos = async () => {
        setLoadingBancos(true)

        // Carregar todos os bancos
        const { data: bancosData } = await supabase.from('bancos').select('*').order('nome')
        if (bancosData) setBancos(bancosData)

        // Verificar quais bancos têm fichas atribuídas a este ligador
        const { data: fichasData } = await supabase
            .from('clientes')
            .select('banco_principal_id')
            .eq('atribuido_a', userId!)

        if (fichasData) {
            const ids = new Set(fichasData.map(f => f.banco_principal_id).filter(Boolean) as string[])
            setBancosComFichas(ids)
        }

        setLoadingBancos(false)
    }

    // Carregar clientes quando selecionar banco
    useEffect(() => {
        if (!bancoSelecionado || !userId) return
        carregarClientes()
    }, [bancoSelecionado, userId])

    const carregarClientes = async () => {
        if (!bancoSelecionado || !userId) return
        setLoading(true)

        const { data } = await supabase
            .from('clientes')
            .select('*, bancos(nome)')
            .eq('banco_principal_id', bancoSelecionado.id)
            .eq('atribuido_a', userId)
            .order('created_at', { ascending: false })

        if (data) setClientes(data)
        setLoading(false)
    }

    const clientesFiltrados = clientes.filter(c => {
        if (!busca) return true
        const termo = busca.toLowerCase()
        return c.cpf?.toLowerCase().includes(termo) || c.nome?.toLowerCase().includes(termo)
    })

    const theme = bancoSelecionado ? getThemeForBank(bancoSelecionado.nome) : null

    const statusBadge = (status: string | null) => {
        switch (status) {
            case 'ativo':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 rounded-md text-[10px] font-semibold">
                        <Smartphone size={10} /> WhatsApp
                    </span>
                )
            case 'fixo':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-md text-[10px] font-semibold">
                        <Phone size={10} /> Fixo
                    </span>
                )
            case 'invalido':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md text-[10px] font-semibold">
                        <AlertTriangle size={10} /> Inválido
                    </span>
                )
            default:
                return (
                    <span className="inline-flex px-2 py-0.5 bg-white/[0.03] text-gray-600 rounded-md text-[10px] font-semibold">
                        Sem info
                    </span>
                )
        }
    }

    // ===== TELA DE SELEÇÃO DE BANCO =====
    if (!bancoSelecionado) {
        return (
            <div className="flex items-center justify-center min-h-[70vh] animate-fade-in">
                <div className="glass-strong rounded-3xl p-8 max-w-lg w-full text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-gradient-to-br from-violet-600/30 to-purple-700/15 border border-violet-500/20">
                        <Zap className="w-8 h-8 text-violet-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Selecione o Banco</h2>
                    <p className="text-sm text-gray-500 mb-6">Escolha qual banco deseja visualizar as fichas.</p>

                    {loadingBancos ? (
                        <p className="text-gray-600 text-sm py-8">Carregando bancos...</p>
                    ) : (
                        <div className="space-y-2">
                            {bancos.map((banco) => {
                                const temFichas = bancosComFichas.has(banco.id)
                                const bancoTheme = getThemeForBank(banco.nome)
                                return (
                                    <button
                                        key={banco.id}
                                        onClick={() => setBancoSelecionado(banco)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-300 group relative overflow-hidden ${temFichas
                                                ? 'bg-white/[0.03] border-white/[0.06] text-gray-300 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1]'
                                                : 'bg-white/[0.01] border-white/[0.03] text-gray-600'
                                            }`}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
                                            style={{
                                                background: temFichas
                                                    ? `rgba(${bancoTheme.primaryRGB}, 0.15)`
                                                    : 'rgba(255,255,255,0.03)'
                                            }}
                                        >
                                            <Landmark
                                                size={14}
                                                style={{ color: temFichas ? bancoTheme.primary : '#333' }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium flex-1 text-left">{banco.nome}</span>
                                        {temFichas ? (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{
                                                background: `rgba(${bancoTheme.primaryRGB}, 0.1)`,
                                                color: bancoTheme.primary,
                                            }}>
                                                Fichas disponíveis
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] text-gray-700 font-medium">
                                                <Lock size={10} /> Sem fichas
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                            {bancos.length === 0 && (
                                <p className="text-gray-600 text-sm py-6">Nenhum banco cadastrado no sistema.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ===== DASHBOARD DE FICHAS =====
    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setBancoSelecionado(null); setClientes([]) }}
                        className="glass px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-all flex items-center gap-2"
                    >
                        ← Trocar Banco
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            Fichas
                            <span
                                className="text-sm font-semibold px-3 py-1 rounded-lg"
                                style={{
                                    background: `rgba(${theme!.primaryRGB}, 0.1)`,
                                    color: theme!.primary,
                                }}
                            >
                                {bancoSelecionado.nome}
                            </span>
                        </h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {clientesFiltrados.length} ficha(s) atribuída(s) a você
                        </p>
                    </div>
                </div>
            </div>

            {/* Busca */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por CPF ou nome..."
                        className="w-full max-w-md pl-10 pr-4 py-3 glass rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                        style={{ '--tw-ring-color': `rgba(${theme!.primaryRGB}, 0.4)` } as React.CSSProperties}
                    />
                </div>
            </div>

            {/* Cards */}
            {loading ? (
                <div className="text-center py-20 text-gray-600 text-sm">Carregando fichas...</div>
            ) : clientesFiltrados.length === 0 ? (
                <div className="text-center py-20 animate-fade-in">
                    <Users className="mx-auto text-gray-800 mb-3" size={48} />
                    <p className="text-gray-600 text-sm">Nenhuma ficha encontrada neste banco.</p>
                    <p className="text-gray-700 text-xs mt-1">Peça ao admin para atribuir fichas a você.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {clientesFiltrados.map((c, i) => (
                        <div
                            key={c.id}
                            className="glass rounded-2xl p-5 card-hover animate-fade-in-up relative overflow-hidden"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            {/* Decorative top line */}
                            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
                                background: `linear-gradient(to right, transparent, ${theme!.primary}, transparent)`,
                                opacity: 0.3,
                            }} />

                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.04] transition-all duration-500"
                                        style={{ background: `linear-gradient(135deg, rgba(${theme!.primaryRGB}, 0.2), rgba(${theme!.primaryRGB}, 0.05))` }}
                                    >
                                        <span className="text-sm font-bold" style={{ color: theme!.primary }}>
                                            {c.nome ? c.nome.charAt(0).toUpperCase() : '#'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{c.nome || 'Sem nome'}</p>
                                        <p className="text-[10px] text-gray-600 font-mono">{c.cpf}</p>
                                    </div>
                                </div>
                                {statusBadge(c.status_whatsapp)}
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="glass rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <TrendingUp size={10} className="text-green-500" />
                                        <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Renda</p>
                                    </div>
                                    <p className="text-sm font-semibold text-white">
                                        {c.renda ? `R$ ${c.renda.toLocaleString()}` : '—'}
                                    </p>
                                </div>
                                <div className="glass rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Star size={10} className="text-yellow-500" />
                                        <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Score</p>
                                    </div>
                                    <p className="text-sm font-semibold text-white">{c.score || '—'}</p>
                                </div>
                            </div>

                            {/* Banco & Tel */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CreditCard size={12} className="text-gray-600" />
                                    <span className="text-xs text-gray-400">{(c.bancos as any)?.nome || 'Sem banco'}</span>
                                </div>
                                {c.telefone && (
                                    <div className="flex items-center gap-2">
                                        <Phone size={12} className="text-gray-600" />
                                        <span className="text-xs text-gray-400 font-mono">{c.telefone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
