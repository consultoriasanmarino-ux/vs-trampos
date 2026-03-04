'use client'

import { useState, useEffect } from 'react'
import {
    Users, Search, Smartphone, Phone, AlertTriangle,
    CreditCard, TrendingUp, Star, Landmark, Zap, Lock, AlertCircle, RefreshCw,
    Calendar, UserCheck, ShieldCheck, MapPin, DollarSign, ExternalLink,
    CheckCircle2, XCircle, MessageSquare, X, Eye, Copy, ChevronDown, Filter
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

    // Paginação
    const [pagina, setPagina] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const [totalRegistros, setTotalRegistros] = useState(0)
    const ITENS_POR_PAGINA = 12

    // Ordenação e Filtros
    const [ordenacao, setOrdenacao] = useState('recentes')
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [estados, setEstados] = useState<string[]>([])

    // Modal de conclusão
    const [concluirModal, setConcluirModal] = useState<{ id: string; nome: string } | null>(null)
    const [concluirTipo, setConcluirTipo] = useState<'concluido_sucesso' | 'concluido_erro' | null>(null)
    const [concluirMotivo, setConcluirMotivo] = useState('')
    const [salvandoConclusao, setSalvandoConclusao] = useState(false)

    // Modal de detalhes
    const [detalhesModal, setDetalhesModal] = useState<Cliente | null>(null)
    const [copiedField, setCopiedField] = useState<string | null>(null)

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
            const { data: bancosData } = await supabase.from('bancos').select('*').order('nome')
            const { data: fichasData } = await supabase
                .from('clientes')
                .select('banco_principal_id')
                .eq('atribuido_a', userId!)

            if (fichasData && bancosData) {
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

    // Carregar estados disponíveis 
    useEffect(() => {
        if (!bancoSelecionado || !userId) return
        const carregarEstados = async () => {
            const { data } = await supabase
                .from('clientes')
                .select('estado')
                .eq('banco_principal_id', bancoSelecionado.id)
                .eq('atribuido_a', userId!)
                .not('estado', 'is', null)
            if (data) {
                const uniqueEstados = [...new Set(data.map(d => d.estado).filter(Boolean))] as string[]
                setEstados(uniqueEstados.sort())
            }
        }
        carregarEstados()
    }, [bancoSelecionado, userId])

    useEffect(() => {
        setPagina(1)
    }, [bancoSelecionado, userId, busca, ordenacao, filtroEstado])

    useEffect(() => {
        if (!bancoSelecionado || !userId) return
        carregarClientes()
    }, [bancoSelecionado, userId, pagina, busca, ordenacao, filtroEstado])

    const carregarClientes = async () => {
        if (!bancoSelecionado || !userId) return
        setLoading(true)

        let query = supabase
            .from('clientes')
            .select('*, bancos(nome)', { count: 'exact' })
            .eq('banco_principal_id', bancoSelecionado.id)
            .eq('atribuido_a', userId)
            .or('status_ficha.is.null,status_ficha.eq.pendente')

        // Aplicar Ordenação
        switch (ordenacao) {
            case 'score_desc':
                query = query.order('score', { ascending: false, nullsFirst: false })
                break
            case 'score_asc':
                query = query.order('score', { ascending: true, nullsFirst: false })
                break
            case 'renda_desc':
                query = query.order('renda', { ascending: false, nullsFirst: false })
                break
            case 'renda_asc':
                query = query.order('renda', { ascending: true, nullsFirst: false })
                break
            case 'idade_desc':
                query = query.order('data_nascimento', { ascending: true, nullsFirst: false })
                break
            case 'idade_asc':
                query = query.order('data_nascimento', { ascending: false, nullsFirst: false })
                break
            default:
                query = query.order('created_at', { ascending: false })
        }

        if (filtroEstado !== 'todos') {
            query = query.eq('estado', filtroEstado)
        }

        if (busca) {
            query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,telefone.ilike.%${busca}%`)
        }

        const from = (pagina - 1) * ITENS_POR_PAGINA
        const to = from + ITENS_POR_PAGINA - 1
        query = query.range(from, to)

        const { data, count } = await query

        if (data) setClientes(data)
        if (count !== null) {
            setTotalRegistros(count)
            setTotalPaginas(Math.ceil(count / ITENS_POR_PAGINA))
        }
        setLoading(false)
    }

    const clientesFiltrados = clientes

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

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 1500)
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (parts) return `${parts[3]}/${parts[2]}/${parts[1]}`
        return dateStr
    }

    const calcularIdade = (dataNasc: string | null) => {
        if (!dataNasc) return null
        const parts = dataNasc.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (!parts) return null
        const nascimento = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]))
        const hoje = new Date()
        let idade = hoje.getFullYear() - nascimento.getFullYear()
        const m = hoje.getMonth() - nascimento.getMonth()
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--
        return idade
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
        <div className="animate-fade-in p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        onClick={() => { setBancoSelecionado(null); setClientes([]) }}
                        className="glass px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-gray-400 hover:text-white transition-all flex items-center gap-2 shrink-0"
                    >
                        ← Trocar
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                            Minhas Fichas
                            <span
                                className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg uppercase tracking-wider"
                                style={{
                                    background: `rgba(${theme!.primaryRGB}, 0.1)`,
                                    color: theme!.primary,
                                    border: `1px solid rgba(${theme!.primaryRGB}, 0.2)`
                                }}
                            >
                                {bancoSelecionado.nome}
                            </span>
                        </h1>
                        <p className="text-gray-600 text-xs sm:text-sm mt-1">
                            {totalRegistros} ficha(s) pronta(s) para contato.
                        </p>
                    </div>
                </div>

                <button
                    onClick={carregarClientes}
                    className="glass p-2.5 rounded-xl text-gray-400 hover:text-white transition-all group self-end sm:self-auto"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                </button>
            </div>

            {/* Busca e Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="relative sm:col-span-2 lg:col-span-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar CPF, nome, tel..."
                        className="w-full pl-11 pr-4 py-3.5 glass rounded-2xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                        style={{ '--tw-ring-color': `rgba(${theme!.primaryRGB}, 0.4)` } as React.CSSProperties}
                    />
                </div>

                <div className="relative group">
                    <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" size={14} />
                    <select
                        value={ordenacao}
                        onChange={(e) => setOrdenacao(e.target.value)}
                        className="w-full pl-11 pr-6 py-3.5 glass rounded-2xl text-white text-sm font-bold focus:outline-none appearance-none cursor-pointer border-white/5 hover:bg-white/[0.05] transition-all"
                    >
                        <option value="recentes" className="bg-[#0a0a0a]">RECENTES</option>
                        <option value="score_desc" className="bg-[#0a0a0a]">MAIOR SCORE</option>
                        <option value="score_asc" className="bg-[#0a0a0a]">MENOR SCORE</option>
                        <option value="renda_desc" className="bg-[#0a0a0a]">MAIOR RENDA</option>
                        <option value="renda_asc" className="bg-[#0a0a0a]">MENOR RENDA</option>
                        <option value="idade_desc" className="bg-[#0a0a0a]">MAIS VELHOS</option>
                        <option value="idade_asc" className="bg-[#0a0a0a]">MAIS NOVOS</option>
                    </select>
                </div>

                <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" size={14} />
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="w-full pl-11 pr-6 py-3.5 glass rounded-2xl text-white text-sm font-bold focus:outline-none appearance-none cursor-pointer border-white/5 hover:bg-white/[0.05] transition-all"
                    >
                        <option value="todos" className="bg-[#0a0a0a]">TODOS ESTADOS</option>
                        {estados.map(est => (
                            <option key={est} value={est} className="bg-[#0a0a0a]">{est}</option>
                        ))}
                    </select>
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {clientesFiltrados.map((c, i) => {
                        const idade = calcularIdade(c.data_nascimento)
                        return (
                            <div
                                key={c.id}
                                className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 card-hover animate-fade-in-up relative overflow-hidden group border border-white/5"
                                style={{ animationDelay: `${i * 0.03}s` }}
                            >
                                {/* Accent overlay */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/[0.05] to-transparent rounded-bl-full pointer-events-none" />

                                {/* Top header of card */}
                                <div className="flex items-start justify-between mb-4 sm:mb-5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-lg font-bold shadow-2xl transition-all duration-500 group-hover:scale-110 shrink-0"
                                            style={{
                                                background: `linear-gradient(135deg, rgba(${theme!.primaryRGB}, 0.3), rgba(${theme!.primaryRGB}, 0.1))`,
                                                color: theme!.primary,
                                                border: `1px solid rgba(${theme!.primaryRGB}, 0.2)`
                                            }}
                                        >
                                            {c.nome ? c.nome.charAt(0) : '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-violet-400 transition-colors truncate">{c.nome || 'Sem Nome'}</h3>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-[10px] sm:text-[11px] font-mono text-gray-500">{c.cpf}</span>
                                                {idade && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/10">
                                                        {idade} anos
                                                    </span>
                                                )}
                                                {(c as any).estado && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/10">
                                                        {(c as any).estado}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-2">
                                        {statusBadge(c.status_whatsapp, c.telefone)}
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
                                    <div className="glass-light rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-white/[0.03]">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <DollarSign size={10} className="text-emerald-500" />
                                            <span className="text-[8px] sm:text-[9px] font-bold text-gray-600 uppercase tracking-wider">Renda</span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold text-white tracking-tight">
                                            {c.renda ? `R$ ${c.renda.toLocaleString()}` : '—'}
                                        </p>
                                    </div>
                                    <div className="glass-light rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-white/[0.03]">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Star size={10} className="text-yellow-500" />
                                            <span className="text-[8px] sm:text-[9px] font-bold text-gray-600 uppercase tracking-wider">Score</span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold text-white tracking-tight">{c.score || '—'}</p>
                                    </div>
                                    <div className="glass-light rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-white/[0.03]">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Calendar size={10} className="text-violet-500" />
                                            <span className="text-[8px] sm:text-[9px] font-bold text-gray-600 uppercase tracking-wider">Nasc.</span>
                                        </div>
                                        <p className="text-[10px] sm:text-xs font-bold text-white tracking-tight">{formatDate(c.data_nascimento) || '—'}</p>
                                    </div>
                                </div>

                                {/* Phone Area - Compact */}
                                {c.telefone ? (
                                    <div className="space-y-1.5 mb-4 max-h-[100px] overflow-y-auto pr-1">
                                        {c.telefone.split(',')
                                            .map(t => {
                                                const val = t.trim()
                                                const hasWA = val.includes('✅')
                                                const hasFix = val.includes('☎️') || val.includes('📞')
                                                const hasInv = val.includes('❌')
                                                const priority = hasWA ? 0 : (hasFix ? 1 : (hasInv ? 2 : 3))
                                                return { val, hasWA, hasFix, hasInv, priority }
                                            })
                                            .sort((a, b) => a.priority - b.priority)
                                            .slice(0, 3)
                                            .map((item, idx) => {
                                                const numOnly = item.val.replace(/\D/g, '')
                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            navigator.clipboard.writeText(numOnly)
                                                            const target = e.currentTarget
                                                            const originalBg = target.style.backgroundColor
                                                            target.style.backgroundColor = 'rgba(255,255,255,0.1)'
                                                            setTimeout(() => target.style.backgroundColor = originalBg, 200)
                                                        }}
                                                        className="group/tel relative flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer active:scale-95"
                                                        title="Clique para copiar"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`p-1 rounded-lg ${item.hasWA ? 'bg-green-500/10' : 'bg-gray-950'}`}>
                                                                {item.hasWA ? (
                                                                    <Smartphone size={12} className="text-green-500" />
                                                                ) : item.hasFix ? (
                                                                    <Phone size={12} className="text-amber-500" />
                                                                ) : (
                                                                    <Phone size={12} className="text-gray-600" />
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-mono font-bold text-gray-400 group-hover/tel:text-white transition-colors tracking-wider">
                                                                {item.val.replace(/[✅☎️📞❌]/g, '').trim()}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5">
                                                            {item.hasWA && (
                                                                <div className="flex items-center gap-1 bg-green-500/10 px-1.5 py-0.5 rounded-md border border-green-500/10">
                                                                    <span className="text-[7px] sm:text-[8px] font-black text-green-400 uppercase">WPP</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                ) : (
                                    <div className="bg-white/[0.01] rounded-2xl p-3 flex items-center gap-3 border border-dashed border-white/[0.05] opacity-50 mb-4">
                                        <div className="p-1.5 rounded-xl bg-gray-900">
                                            <Lock size={12} className="text-gray-700" />
                                        </div>
                                        <p className="text-[10px] sm:text-xs font-medium text-gray-600 italic">Telefone não disponível</p>
                                    </div>
                                )}

                                {/* Status da Ficha + Botões */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    {fichaStatusBadge((c as any).status_ficha)}
                                    <div className="flex items-center gap-2">
                                        {/* Botão Ver Todos os Dados */}
                                        <button
                                            onClick={() => setDetalhesModal(c)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all active:scale-95 border border-white/5"
                                        >
                                            <Eye size={13} /> Ver Dados
                                        </button>
                                        {!(c as any).status_ficha && (
                                            <button
                                                onClick={() => setConcluirModal({ id: c.id, nome: c.nome || 'Sem Nome' })}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold text-white transition-all active:scale-95 hover:shadow-lg"
                                                style={{ background: `linear-gradient(135deg, ${theme!.primary}, ${theme!.primary}88)` }}
                                            >
                                                <CheckCircle2 size={13} /> Concluir
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Paginação */}
            {!loading && totalPaginas > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-12 pb-10 animate-fade-in">
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center md:text-left">
                        Página <span className="text-white">{pagina}</span> de <span className="text-white">{totalPaginas}</span>
                        <span className="mx-3 opacity-20">|</span>
                        Total de <span className="text-white">{totalRegistros}</span> fichas
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagina(p => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            className="glass px-4 sm:px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all border-white/5"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                            disabled={pagina === totalPaginas}
                            className="glass px-4 sm:px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all border-white/5"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}

            {/* ===== MODAL DE DETALHES COMPLETOS ===== */}
            {detalhesModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setDetalhesModal(null)}>
                    <div
                        className="glass-strong rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header do Modal */}
                        <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-xl px-6 py-5 border-b border-white/5 flex items-center justify-between rounded-t-3xl">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold"
                                    style={{
                                        background: `linear-gradient(135deg, rgba(${theme!.primaryRGB}, 0.3), rgba(${theme!.primaryRGB}, 0.1))`,
                                        color: theme!.primary,
                                        border: `1px solid rgba(${theme!.primaryRGB}, 0.2)`
                                    }}
                                >
                                    {detalhesModal.nome ? detalhesModal.nome.charAt(0) : '?'}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{detalhesModal.nome || 'Sem Nome'}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{detalhesModal.cpf}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetalhesModal(null)}
                                className="p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="px-6 py-6 space-y-4">
                            {/* Status */}
                            <div className="flex items-center gap-3 flex-wrap">
                                {statusBadge(detalhesModal.status_whatsapp, detalhesModal.telefone)}
                                {fichaStatusBadge((detalhesModal as any).status_ficha)}
                            </div>

                            {/* Dados Pessoais */}
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">Dados Pessoais</h4>
                                <DetailRow label="Nome Completo" value={detalhesModal.nome || '—'} onCopy={() => copyToClipboard(detalhesModal.nome || '', 'nome')} copied={copiedField === 'nome'} />
                                <DetailRow label="CPF" value={detalhesModal.cpf} onCopy={() => copyToClipboard(detalhesModal.cpf, 'cpf')} copied={copiedField === 'cpf'} />
                                <DetailRow label="Data de Nascimento" value={formatDate(detalhesModal.data_nascimento)} />
                                <DetailRow label="Idade" value={calcularIdade(detalhesModal.data_nascimento) ? `${calcularIdade(detalhesModal.data_nascimento)} anos` : '—'} />
                                <DetailRow label="Estado" value={(detalhesModal as any).estado || '—'} />
                                <DetailRow label="Cidade" value={(detalhesModal as any).cidade || '—'} />
                                <DetailRow label="Endereço" value={(detalhesModal as any).endereco || '—'} />
                            </div>

                            {/* Dados Financeiros */}
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 mt-6">Dados Financeiros</h4>
                                <DetailRow label="Renda" value={detalhesModal.renda ? `R$ ${detalhesModal.renda.toLocaleString()}` : '—'} accent="emerald" />
                                <DetailRow label="Score" value={detalhesModal.score?.toString() || '—'} accent="amber" />
                                <DetailRow label="BIN Cartão" value={detalhesModal.bin_cartao || '—'} />
                                <DetailRow label="Validade Cartão" value={detalhesModal.validade_cartao || '—'} />
                                <DetailRow label="Banco Principal" value={(detalhesModal.bancos as any)?.nome || '—'} />
                            </div>

                            {/* Telefones */}
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 mt-6">Telefones</h4>
                                {detalhesModal.telefone ? (
                                    detalhesModal.telefone.split(',')
                                        .map(t => {
                                            const val = t.trim()
                                            const hasWA = val.includes('✅')
                                            const hasFix = val.includes('☎️') || val.includes('📞')
                                            const hasInv = val.includes('❌')
                                            const priority = hasWA ? 0 : (hasFix ? 1 : (hasInv ? 2 : 3))
                                            return { val, hasWA, hasFix, hasInv, priority }
                                        })
                                        .sort((a, b) => a.priority - b.priority)
                                        .map((item, idx) => {
                                            const numOnly = item.val.replace(/\D/g, '')
                                            const cleanNum = item.val.replace(/[✅☎️📞❌]/g, '').trim()
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => copyToClipboard(numOnly, `tel-${idx}`)}
                                                    className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer active:scale-[0.98]"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${item.hasWA ? 'bg-green-500/10' : item.hasFix ? 'bg-amber-500/10' : 'bg-gray-900'}`}>
                                                            {item.hasWA ? <Smartphone size={14} className="text-green-500" />
                                                                : item.hasFix ? <Phone size={14} className="text-amber-500" />
                                                                    : <Phone size={14} className="text-gray-600" />}
                                                        </div>
                                                        <span className="text-sm font-mono font-bold text-gray-300 tracking-wider">{cleanNum}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {item.hasWA && <span className="text-[8px] font-black text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/10">WPP</span>}
                                                        {item.hasFix && <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">FIXO</span>}
                                                        {item.hasInv && <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/10">INVÁLIDO</span>}
                                                        {copiedField === `tel-${idx}` ? (
                                                            <CheckCircle2 size={14} className="text-green-400" />
                                                        ) : (
                                                            <Copy size={14} className="text-gray-600" />
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                ) : (
                                    <p className="text-xs text-gray-600 italic p-3">Nenhum telefone disponível</p>
                                )}
                            </div>

                            {/* Metadados */}
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 mt-6">Sistema</h4>
                                <DetailRow label="Data de Entrada" value={new Date(detalhesModal.created_at).toLocaleString('pt-BR')} />
                                <DetailRow label="WhatsApp Verificado" value={detalhesModal.wpp_checked ? 'Sim ✅' : 'Não'} />
                                <DetailRow label="Status Ficha" value={(detalhesModal as any).status_ficha || 'Pendente'} />
                                {(detalhesModal as any).motivo_conclusao && (
                                    <DetailRow label="Motivo Conclusão" value={(detalhesModal as any).motivo_conclusao} />
                                )}
                                {(detalhesModal as any).concluido_em && (
                                    <DetailRow label="Concluído em" value={new Date((detalhesModal as any).concluido_em).toLocaleString('pt-BR')} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL DE CONCLUSÃO ===== */}
            {concluirModal && (
                <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center animate-fade-in" onClick={() => { setConcluirModal(null); setConcluirTipo(null); setConcluirMotivo('') }}>
                    <div className="glass-strong rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full sm:max-w-md animate-fade-in-up relative" onClick={(e) => e.stopPropagation()}>
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

// Componente auxiliar para linhas de detalhe
function DetailRow({ label, value, onCopy, copied, accent }: { label: string; value: string; onCopy?: () => void; copied?: boolean; accent?: string }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-all group">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-xs sm:text-sm font-bold ${accent === 'emerald' ? 'text-emerald-400' : accent === 'amber' ? 'text-amber-400' : 'text-white'} text-right max-w-[180px] sm:max-w-[220px] truncate`}>
                    {value}
                </span>
                {onCopy && (
                    <button onClick={onCopy} className="p-1 rounded-lg hover:bg-white/10 transition-all">
                        {copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                )}
            </div>
        </div>
    )
}
