'use client'

import { useState, useEffect } from 'react'
import {
    Users, Search, Smartphone, Phone, AlertTriangle,
    RefreshCw, Filter, TrendingUp, Calendar, CheckCircle2, XCircle,
    Eye, MoreHorizontal, LayoutList, ChevronLeft, ChevronRight, DollarSign, Star
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function FichasResumidasPage() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()
    const [leads, setLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [filtroStatusFicha, setFiltroStatusFicha] = useState('todos')
    const [ordenacao, setOrdenacao] = useState('recentes')

    // Paginação
    const [pagina, setPagina] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const [totalRegistros, setTotalRegistros] = useState(0)
    const ITENS_POR_PAGINA = 50

    useEffect(() => {
        setPagina(1)
    }, [selectedBankId, filtroStatusFicha, busca, ordenacao])

    useEffect(() => {
        carregarFichas()
    }, [selectedBankId, filtroStatusFicha, pagina, busca, ordenacao])

    const carregarFichas = async () => {
        setLoading(true)
        let query = supabase
            .from('clientes')
            .select('*, bancos(nome), ligadores(nome)', { count: 'exact' })
            .not('status_ficha', 'is', null)
            .not('status_ficha', 'eq', 'pendente')

        if (selectedBankId) {
            query = query.eq('banco_principal_id', selectedBankId)
        }

        if (filtroStatusFicha !== 'todos') {
            query = query.eq('status_ficha', filtroStatusFicha)
        }

        if (busca) {
            query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%`)
        }

        // Aplicar Ordenação
        switch (ordenacao) {
            case 'score_desc':
                query = query.order('score', { ascending: false, nullsFirst: false })
                break
            case 'renda_desc':
                query = query.order('renda', { ascending: false, nullsFirst: false })
                break
            case 'antigos':
                query = query.order('concluido_em', { ascending: true })
                break
            default:
                query = query.order('concluido_em', { ascending: false })
        }

        const from = (pagina - 1) * ITENS_POR_PAGINA
        const to = from + ITENS_POR_PAGINA - 1
        query = query.range(from, to)

        const { data, error, count } = await query
        if (error) console.error('Erro:', error)

        if (data) setLeads(data)
        if (count !== null) {
            setTotalRegistros(count)
            setTotalPaginas(Math.ceil(count / ITENS_POR_PAGINA))
        }
        setLoading(false)
    }

    const formatCurrency = (value: number | null) => {
        if (value === null) return '—'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    return (
        <div className="p-6 lg:p-10 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-4">
                        Fichas Resumidas
                        {selectedBankName && (
                            <span
                                className="text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest bg-white/5 border border-white/10"
                                style={{ color: theme.primary }}
                            >
                                {selectedBankName}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">
                        Histórico completo de fichas finalizadas e seus resultados
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="glass px-4 py-2 rounded-xl flex items-center gap-4 border-white/5">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-600 uppercase">Total Finalizadas</p>
                            <p className="text-lg font-black text-white leading-none">{totalRegistros}</p>
                        </div>
                        <div className="w-[1px] h-8 bg-white/10" />
                        <LayoutList className="text-gray-500" size={20} />
                    </div>
                    <button
                        onClick={carregarFichas}
                        className="glass p-3 rounded-xl text-gray-400 hover:text-white transition-all border-white/5"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome ou CPF..."
                        className="w-full pl-12 pr-6 py-4 glass rounded-2xl text-white placeholder-gray-700 text-sm font-medium focus:outline-none border-white/5"
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <select
                        value={filtroStatusFicha}
                        onChange={(e) => setFiltroStatusFicha(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 glass rounded-2xl text-white text-sm font-bold appearance-none focus:outline-none border-white/5"
                    >
                        <option value="todos" className="bg-[#0a0a0a]">TODOS RESULTADOS</option>
                        <option value="concluido_sucesso" className="bg-[#0a0a0a]">SUCESSO</option>
                        <option value="concluido_erro" className="bg-[#0a0a0a]">SEM SUCESSO</option>
                    </select>
                </div>

                <div className="relative">
                    <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <select
                        value={ordenacao}
                        onChange={(e) => setOrdenacao(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 glass rounded-2xl text-white text-sm font-bold appearance-none focus:outline-none border-white/5"
                    >
                        <option value="recentes" className="bg-[#0a0a0a]">MAIS RECENTES</option>
                        <option value="antigos" className="bg-[#0a0a0a]">MAIS ANTIGOS</option>
                        <option value="score_desc" className="bg-[#0a0a0a]">MAIOR SCORE</option>
                        <option value="renda_desc" className="bg-[#0a0a0a]">MAIOR RENDA</option>
                    </select>
                </div>
            </div>

            {/* Tabela/Lista */}
            <div className="glass rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5">
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Cliente</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Dados</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Ligador</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Resultado</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Motivo/Obs</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Data</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <RefreshCw className="animate-spin text-gray-700 mx-auto mb-4" size={32} />
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Carregando histórico...</p>
                                </td>
                            </tr>
                        ) : leads.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-32 text-center">
                                    <p className="text-gray-500 font-bold italic">Nenhuma ficha finalizada encontrada.</p>
                                </td>
                            </tr>
                        ) : leads.map((f) => (
                            <tr key={f.id} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-sm font-black text-white group-hover:scale-110 transition-all border border-white/5">
                                            {f.nome?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white leading-tight uppercase tracking-tight">{f.nome || 'Sem Nome'}</p>
                                            <p className="text-[10px] font-bold text-gray-600 font-mono mt-1">{f.cpf}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col gap-1 items-center">
                                        <div className="flex items-center gap-2 group/tip">
                                            <Star size={10} className="text-amber-500" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Score: <span className="text-white">{f.score || '—'}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2 group/tip">
                                            <DollarSign size={10} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Renda: <span className="text-white">{formatCurrency(f.renda)}</span></span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                                        <span className="text-xs font-black text-gray-300 uppercase tracking-wider">{(f.ligadores as any)?.nome || 'Sistema'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    {f.status_ficha === 'concluido_sucesso' ? (
                                        <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex items-center gap-2 w-fit">
                                            <CheckCircle2 size={12} /> SUCESSO
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-500/20 flex items-center gap-2 w-fit">
                                            <XCircle size={12} /> SEM SUCESSO
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-5 max-w-[200px]">
                                    <p className="text-xs font-medium text-gray-400 line-clamp-2 italic" title={f.motivo_conclusao}>
                                        {f.motivo_conclusao || 'Nenhuma observação registrada.'}
                                    </p>
                                </td>
                                <td className="px-6 py-5 text-right whitespace-nowrap">
                                    <p className="text-[10px] font-black text-gray-500 uppercase">{new Date(f.concluido_em).toLocaleDateString()}</p>
                                    <p className="text-[10px] font-bold text-gray-700 font-mono">{new Date(f.concluido_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Paginação */}
            {!loading && totalPaginas > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-10 pb-10">
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        Página <span className="text-white">{pagina}</span> de <span className="text-white">{totalPaginas}</span>
                        <span className="mx-3 opacity-20">|</span>
                        Total de <span className="text-white">{totalRegistros}</span> fichas concluídas
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagina(p => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            className="glass px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all border-white/5"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                            disabled={pagina === totalPaginas}
                            className="glass px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all border-white/5"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
