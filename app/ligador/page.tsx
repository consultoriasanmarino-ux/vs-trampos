'use client'

import { useState, useEffect } from 'react'
import {
    Users, Search, Smartphone, Phone, AlertTriangle,
    CreditCard, TrendingUp, Star, Landmark, Zap, Lock, AlertCircle, RefreshCw,
    Calendar, UserCheck, ShieldCheck, MapPin, DollarSign, ExternalLink,
    CheckCircle2, XCircle, MessageSquare, X
} from 'lucide-react'
import { supabase, Cliente, Banco } from '@/lib/supabase'
import { themeFromColor } from '@/lib/bank-theme'

export default function LigadorPage() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [bancos, setBancos] = useState<Banco[]>([])
    const [bancosComFichas, setBancosComFichas] = useState<{ id: string, count: number }[]>([])
    const [bancoSelecionado, setBancoSelecionado] = useState<Banco | null>(null)
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingBancos, setLoadingBancos] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [statusSemFichas, setStatusSemFichas] = useState(false)

    // Modal de conclusão
    const [concluirModal, setConcluirModal] = useState<{ id: string; nome: string } | null>(null)
    const [concluirTipo, setConcluirTipo] = useState<'concluido_sucesso' | 'concluido_erro' | null>(null)
    const [concluirMotivo, setConcluirMotivo] = useState('')
    const [salvandoConclusao, setSalvandoConclusao] = useState(false)

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
        setStatusSemFichas(false)

        try {
            // Carregar todos os bancos
            const { data: bancosData } = await supabase.from('bancos').select('*').order('nome')

            // Verificar contagem de fichas por banco para este ligador
            const { data: fichasData } = await supabase
                .from('clientes')
                .select('banco_principal_id')
                .eq('atribuido_a', userId!)

            if (fichasData && bancosData) {
                // Conta quantas fichas cada banco tem
                const countsMap: Record<string, number> = {}
                fichasData.forEach(f => {
                    if (f.banco_principal_id) {
                        countsMap[f.banco_principal_id] = (countsMap[f.banco_principal_id] || 0) + 1
                    }
                })

                const bancosComContagem = Object.entries(countsMap).map(([id, count]) => ({ id, count }))
                setBancosComFichas(bancosComContagem)
                setBancos(bancosData)

                if (bancosComContagem.length === 0) {
                    setStatusSemFichas(true)
                } else {
                    // Seleciona automaticamente o banco com mais fichas
                    const maior = bancosComContagem.sort((a, b) => b.count - a.count)[0]
                    const banco = bancosData.find(b => b.id === maior.id)
                    if (banco) setBancoSelecionado(banco)
                }
            }
        } catch (err) {
            console.error('Erro ao carregar bancos:', err)
        } finally {
            setLoadingBancos(false)
        }
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
        return c.cpf?.toLowerCase().includes(termo) || c.nome?.toLowerCase().includes(termo) || c.telefone?.includes(termo)
    })

    const theme = bancoSelecionado ? themeFromColor(bancoSelecionado.cor) : null

    const handleConcluir = async () => {
        if (!concluirModal || !concluirTipo) return
        setSalvandoConclusao(true)
        try {
            await supabase.from('clientes').update({
                status_ficha: concluirTipo,
                motivo_conclusao: concluirMotivo || (concluirTipo === 'concluido_sucesso' ? 'Concluído com sucesso' : 'Sem sucesso'),
                concluido_em: new Date().toISOString()
            }).eq('id', concluirModal.id)

            setConcluirModal(null)
            setConcluirTipo(null)
            setConcluirMotivo('')
            carregarClientes()
        } catch (err) {
            console.error('Erro ao concluir ficha:', err)
        }
        setSalvandoConclusao(false)
    }

    const fichaStatusBadge = (statusFicha: string | null) => {
        switch (statusFicha) {
            case 'concluido_sucesso':
                return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-500/10"><CheckCircle2 size={10} /> SUCESSO</span>
            case 'concluido_erro':
                return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-bold border border-rose-500/10"><XCircle size={10} /> SEM SUCESSO</span>
            default:
                return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-bold border border-amber-500/10">● PENDENTE</span>
        }
    }

    const statusBadge = (status: string | null, telefone: string | null) => {
        if (!status && telefone) {
            return (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-full text-[10px] font-bold border border-purple-500/10">
                    <RefreshCw size={10} className="animate-spin" /> ANALISANDO...
                </span>
            )
        }
        switch (status) {
            case 'ativo':
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-400 rounded-full text-[10px] font-bold border border-green-500/10">
                        <Smartphone size={10} /> WHATSAPP
                    </span>
                )
            case 'fixo':
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-[10px] font-bold border border-yellow-500/10">
                        <Phone size={10} /> FIXO
                    </span>
                )
            case 'invalido':
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-400 rounded-full text-[10px] font-bold border border-red-500/10">
                        <AlertTriangle size={10} /> INVÁLIDO
                    </span>
                )
            default:
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 text-gray-500 rounded-full text-[10px] font-bold border border-white/10">
                        SEM INFO
                    </span>
                )
        }
    }

    // ===== TELA DE SEM FICHAS =====
    if (statusSemFichas) {
        return (
            <div className="flex items-center justify-center min-h-[70vh] animate-fade-in">
                <div className="glass-strong rounded-3xl p-10 max-w-sm w-full text-center">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-500/10 border border-red-500/20">
                        <AlertCircle size={40} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Sem Fichas Disponíveis</h2>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                        Você não possui fichas atribuídas para nenhum banco no momento.
                    </p>
                    <div className="p-4 bg-white/5 rounded-2xl mb-8 border border-white/5">
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-2">O que fazer?</p>
                        <p className="text-xs text-white">Entre em contato com o Gerente <span className="text-violet-400 font-bold">(VS)</span> para solicitar novas cargas de leads.</p>
                    </div>
                    <button
                        onClick={() => carregarBancos()}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/10"
                    >
                        <RefreshCw size={16} className={loadingBancos ? 'animate-spin' : ''} /> Ver novamente
                    </button>
                </div>
            </div>
        )
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
                                const fichaInfo = bancosComFichas.find(f => f.id === banco.id)
                                const count = fichaInfo?.count || 0
                                const temFichas = count > 0
                                const bancoTheme = themeFromColor(banco.cor)
                                return (
                                    <button
                                        key={banco.id}
                                        onClick={() => setBancoSelecionado(banco)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-300 group relative overflow-hidden ${temFichas
                                            ? 'bg-white/[0.03] border-white/[0.06] text-gray-300 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1]'
                                            : 'bg-white/[0.01] border-white/[0.03] text-gray-600 opacity-50'
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
                                                {count} Fichas
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] text-gray-700 font-medium">
                                                <Lock size={10} /> Sem fichas
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ===== DASHBOARD DE FICHAS =====
    return (
        <div className="animate-fade-in p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setBancoSelecionado(null); setClientes([]) }}
                        className="glass px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-all flex items-center gap-2"
                    >
                        ← Trocar Banco
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            Minhas Fichas
                            <span
                                className="text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider"
                                style={{
                                    background: `rgba(${theme!.primaryRGB}, 0.1)`,
                                    color: theme!.primary,
                                    border: `1px solid rgba(${theme!.primaryRGB}, 0.2)`
                                }}
                            >
                                {bancoSelecionado.nome}
                            </span>
                        </h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {clientesFiltrados.length} ficha(s) pronta(s) para contato.
                        </p>
                    </div>
                </div>

                <button
                    onClick={carregarClientes}
                    className="glass p-2.5 rounded-xl text-gray-400 hover:text-white transition-all group"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                </button>
            </div>

            {/* Busca */}
            <div className="mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por CPF, nome ou telefone..."
                        className="w-full max-w-xl pl-12 pr-4 py-4 glass rounded-2xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                        style={{ '--tw-ring-color': `rgba(${theme!.primaryRGB}, 0.4)` } as React.CSSProperties}
                    />
                </div>
            </div>

            {/* Grid of Cards */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                    <RefreshCw size={32} className="animate-spin mb-4" />
                    <p className="text-sm font-medium">Carregando fichas detalhadas...</p>
                </div>
            ) : clientesFiltrados.length === 0 ? (
                <div className="text-center py-24 glass rounded-3xl border border-dashed border-white/5">
                    <Users className="mx-auto text-gray-800 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Nenhuma ficha encontrada.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {clientesFiltrados.map((c, i) => (
                        <div
                            key={c.id}
                            className="glass rounded-3xl p-6 card-hover animate-fade-in-up relative overflow-hidden group border border-white/5"
                            style={{ animationDelay: `${i * 0.03}s` }}
                        >
                            {/* Accent overlay */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/[0.05] to-transparent rounded-bl-full pointer-events-none" />

                            {/* Top header of card */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-2xl transition-all duration-500 group-hover:scale-110"
                                        style={{
                                            background: `linear-gradient(135deg, rgba(${theme!.primaryRGB}, 0.3), rgba(${theme!.primaryRGB}, 0.1))`,
                                            color: theme!.primary,
                                            border: `1px solid rgba(${theme!.primaryRGB}, 0.2)`
                                        }}
                                    >
                                        {c.nome ? c.nome.charAt(0) : '?'}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white group-hover:text-violet-400 transition-colors truncate max-w-[140px]">{c.nome || 'Sem Nome'}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[11px] font-mono text-gray-500">{c.cpf}</span>
                                        </div>
                                    </div>
                                </div>
                                {statusBadge(c.status_whatsapp, c.telefone)}
                            </div>

                            {/* Info Grid - 2x2 */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="glass-light rounded-2xl p-3 border border-white/[0.03]">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <DollarSign size={12} className="text-emerald-500" />
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Renda</span>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-tight">
                                        {c.renda ? `R$ ${c.renda.toLocaleString()}` : '—'}
                                    </p>
                                </div>
                                <div className="glass-light rounded-2xl p-3 border border-white/[0.03]">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Star size={12} className="text-yellow-500" />
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Score</span>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-tight">{c.score || '—'}</p>
                                </div>
                                <div className="glass-light rounded-2xl p-3 border border-white/[0.03]">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Calendar size={12} className="text-violet-500" />
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Nasc.</span>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-tight">{c.data_nascimento || '—'}</p>
                                </div>
                                <div className="glass-light rounded-2xl p-3 border border-white/[0.03]">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <CreditCard size={12} className="text-blue-500" />
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Banco</span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 truncate tracking-tight">
                                        {(c.bancos as any)?.nome || '—'}
                                    </p>
                                </div>
                            </div>

                            {/* Phone Area */}
                            {c.telefone ? (
                                <a
                                    href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    className={`w-full bg-white/[0.02] rounded-2xl p-4 flex items-center justify-between border border-white/[0.04] transition-all group-hover:bg-white/[0.04] group-hover:border-white/[0.1] active:scale-[0.98] ${c.status_whatsapp !== 'ativo' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl bg-gray-900 group-hover:bg-black transition-colors`}>
                                            <Phone size={14} className={c.status_whatsapp === 'ativo' ? 'text-green-500' : 'text-gray-600'} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-700 uppercase mb-0.5">Telefone</p>
                                            <p className="text-sm font-mono font-bold text-gray-400 tracking-wider">
                                                {c.telefone}
                                            </p>
                                        </div>
                                    </div>
                                    {c.status_whatsapp === 'ativo' && (
                                        <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                                            <ExternalLink size={16} />
                                        </div>
                                    )}
                                </a>
                            ) : (
                                <div className="bg-white/[0.01] rounded-2xl p-4 flex items-center gap-3 border border-white/[0.03] opacity-50">
                                    <div className="p-2 rounded-xl bg-gray-900">
                                        <Lock size={14} className="text-gray-700" />
                                    </div>
                                    <p className="text-xs font-medium text-gray-600 italic">Telefone não disponível</p>
                                </div>
                            )}

                            {/* Status da Ficha + Botão Concluir */}
                            <div className="mt-4 flex items-center justify-between">
                                {fichaStatusBadge((c as any).status_ficha)}
                                {!(c as any).status_ficha && (
                                    <button
                                        onClick={() => setConcluirModal({ id: c.id, nome: c.nome || 'Sem Nome' })}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 hover:shadow-lg"
                                        style={{ background: `linear-gradient(135deg, ${theme!.primary}, ${theme!.primary}88)` }}
                                    >
                                        <CheckCircle2 size={14} /> Concluir
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== MODAL DE CONCLUSÃO ===== */}
            {concluirModal && (
                <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-strong rounded-3xl p-8 max-w-md w-full animate-fade-in-up relative">
                        <button onClick={() => { setConcluirModal(null); setConcluirTipo(null); setConcluirMotivo('') }} className="absolute top-4 right-4 p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                            <X size={18} />
                        </button>

                        <h3 className="text-lg font-bold text-white mb-1">Concluir Ficha</h3>
                        <p className="text-sm text-gray-500 mb-6">Como foi o contato com <span className="text-white font-bold">{concluirModal.nome}</span>?</p>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => setConcluirTipo('concluido_sucesso')}
                                className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${concluirTipo === 'concluido_sucesso' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'}`}
                            >
                                <CheckCircle2 size={28} className={concluirTipo === 'concluido_sucesso' ? 'text-emerald-400' : 'text-gray-600'} />
                                <span className={`text-sm font-bold ${concluirTipo === 'concluido_sucesso' ? 'text-emerald-400' : 'text-gray-500'}`}>Deu Certo!</span>
                            </button>
                            <button
                                onClick={() => setConcluirTipo('concluido_erro')}
                                className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${concluirTipo === 'concluido_erro' ? 'border-rose-500 bg-rose-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'}`}
                            >
                                <XCircle size={28} className={concluirTipo === 'concluido_erro' ? 'text-rose-400' : 'text-gray-600'} />
                                <span className={`text-sm font-bold ${concluirTipo === 'concluido_erro' ? 'text-rose-400' : 'text-gray-500'}`}>Não Deu</span>
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 block">Motivo / Observação</label>
                            <textarea
                                value={concluirMotivo}
                                onChange={(e) => setConcluirMotivo(e.target.value)}
                                placeholder="Descreva o resultado do contato..."
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 px-4 text-white placeholder-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none h-24"
                            />
                        </div>

                        <button
                            onClick={handleConcluir}
                            disabled={!concluirTipo || salvandoConclusao}
                            className="w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                            style={{ background: concluirTipo === 'concluido_sucesso' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : concluirTipo === 'concluido_erro' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255,255,255,0.1)' }}
                        >
                            {salvandoConclusao ? 'Salvando...' : 'Confirmar Conclusão'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
