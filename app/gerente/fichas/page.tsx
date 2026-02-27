'use client'

import { useState, useEffect } from 'react'
import {
    Users, Search, Smartphone, Phone, AlertTriangle,
    RefreshCw, UserPlus, ChevronDown, Check, X,
    UserCog, Zap, CreditCard, Clock, CheckCircle2, XCircle,
    TrendingUp
} from 'lucide-react'
import { supabase, Cliente, Ligador } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function GerenteFichas() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()
    const [leads, setLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [filtroStatus, setFiltroStatus] = useState('todos')
    const [ligadores, setLigadores] = useState<{ id: string, nome: string }[]>([])
    const [assigningId, setAssigningId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'atribuir' | 'andamento'>('atribuir')

    // Paginação
    const [pagina, setPagina] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const [totalRegistros, setTotalRegistros] = useState(0)
    const ITENS_POR_PAGINA = 24

    // Ordenação
    const [ordenacao, setOrdenacao] = useState('recentes')

    useEffect(() => {
        carregarLigadores()
    }, [])

    useEffect(() => {
        setPagina(1)
    }, [selectedBankId, filtroStatus, activeTab, busca, ordenacao])

    useEffect(() => {
        if (selectedBankId) {
            carregarFichas()
        }
    }, [selectedBankId, filtroStatus, activeTab, pagina, busca, ordenacao])

    const carregarLigadores = async () => {
        const { data } = await supabase.from('ligadores').select('id, nome').order('nome')
        if (data) setLigadores(data)
    }

    const carregarFichas = async () => {
        if (!selectedBankId) return
        setLoading(true)
        let query = supabase
            .from('clientes')
            .select('*', { count: 'exact' })
            .eq('banco_principal_id', selectedBankId)

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
            default:
                query = query.order('created_at', { ascending: false })
        }

        if (activeTab === 'atribuir') {
            query = query.is('atribuido_a', null)
        } else {
            query = query.not('atribuido_a', 'is', null)
        }

        if (busca) {
            query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,telefone.ilike.%${busca}%`)
        }

        const from = (pagina - 1) * ITENS_POR_PAGINA
        const to = from + ITENS_POR_PAGINA - 1
        query = query.range(from, to)

        const { data, count } = await query
        if (data) setLeads(data)
        if (count !== null) {
            setTotalRegistros(count)
            setTotalPaginas(Math.ceil(count / ITENS_POR_PAGINA))
        }
        setLoading(false)
    }

    const handleAtribuir = async (clienteId: string, ligadorId: string | null) => {
        setAssigningId(clienteId)
        const { error } = await supabase
            .from('clientes')
            .update({ atribuido_a: ligadorId })
            .eq('id', clienteId)

        if (error) {
            console.error('[Gerente] Erro ao atribuir:', error)
            alert(`Erro ao atribuir: ${error.message}`)
            setAssigningId(null)
            return
        }

        // Sucesso: a ficha some da lista atual para o gerente (conforme solicitado)
        setLeads(prev => prev.filter(l => l.id !== clienteId))
        setAssigningId(null)
    }

    const leadsFiltrados = leads

    const statusBadge = (status: string | null, telefone: string | null) => {
        if (!status && telefone) {
            return (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] font-bold border border-purple-500/10">
                    <RefreshCw size={12} className="animate-spin" /> ANALISANDO...
                </span>
            )
        }
        switch (status) {
            case 'ativo': return <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-black border border-emerald-500/10 text-emerald-400">✅ WhatsApp</span>
            case 'fixo': return <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/10"><Phone size={12} /> Fixo</span>
            case 'invalido': return <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-bold border border-rose-500/10"><AlertTriangle size={12} /> Inválido</span>
            default: return <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-500 rounded-lg text-[10px] font-bold border border-white/10">Sem Info</span>
        }
    }

    return (
        <div className="p-6 lg:p-10 animate-fade-in">
            {/* Header / Top */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-4">
                        Gerenciamento de Fichas
                        <span className="text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            {selectedBankName}
                        </span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">
                        {activeTab === 'atribuir' ? 'Distribua as novas fichas para sua equipe' : 'Monitore o progresso dos ligadores agora mesmo'}
                    </p>
                </div>
                <button onClick={carregarFichas} className="glass p-3.5 rounded-2xl text-gray-400 hover:text-white transition-all group border-white/10">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                </button>
            </div>

            {/* Abas - Estilo Admin */}
            <div className="flex gap-2 mb-8 p-1.5 bg-white/[0.02] rounded-2xl border border-white/5 w-fit">
                <button
                    onClick={() => setActiveTab('atribuir')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'atribuir' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
                >
                    <UserPlus size={14} /> Para Atribuir
                </button>
                <button
                    onClick={() => setActiveTab('andamento')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'andamento' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
                >
                    <Zap size={14} /> Em Andamento
                </button>
            </div>

            {/* Filtros e Busca */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome, CPF ou celular..."
                        className="w-full pl-12 pr-6 py-4 glass rounded-3xl text-white placeholder-gray-700 text-sm font-medium focus:outline-none focus:ring-2 transition-all border-white/5"
                    />
                </div>

                <div className="relative group">
                    <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" size={16} />
                    <select
                        value={ordenacao}
                        onChange={(e) => setOrdenacao(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 glass rounded-3xl text-white text-sm font-bold focus:outline-none appearance-none cursor-pointer border-white/5 hover:bg-white/[0.05] transition-all"
                    >
                        <option value="recentes" className="bg-[#0a0a0a]">RECENTES</option>
                        <option value="score_desc" className="bg-[#0a0a0a]">MAIOR SCORE</option>
                        <option value="score_asc" className="bg-[#0a0a0a]">MENOR SCORE</option>
                        <option value="renda_desc" className="bg-[#0a0a0a]">MAIOR RENDA</option>
                        <option value="renda_asc" className="bg-[#0a0a0a]">MENOR RENDA</option>
                    </select>
                </div>
            </div>

            {/* Conteúdo Central */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-600">
                    <RefreshCw size={32} className="animate-spin mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest opacity-50 text-gray-400">Sincronizando banco...</p>
                </div>
            ) : leadsFiltrados.length === 0 ? (
                <div className="text-center py-40 glass rounded-[2.5rem] border border-dashed border-white/10 opacity-50">
                    <CreditCard className="mx-auto text-gray-800 mb-6" size={60} />
                    <p className="text-lg font-bold text-gray-500">Nenhuma ficha para mostrar</p>
                    <p className="text-sm text-gray-700 mt-1">Selecione outro banco ou aba.</p>
                </div>
            ) : activeTab === 'atribuir' ? (
                /* MODELO PREMIUM DE CARDS (IGUAL ADMIN) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {leadsFiltrados.map((c, i) => {
                        const isAssigning = assigningId === c.id
                        return (
                            <div key={c.id} className="glass rounded-[2rem] p-6 card-hover animate-fade-in-up relative group border border-white/5" style={{ animationDelay: `${i * 0.03}s` }}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black bg-white/5 text-white border border-white/10">
                                            {c.nome ? c.nome.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white truncate max-w-[120px]">{c.nome || 'Sem Nome'}</h3>
                                            <p className="text-[10px] font-mono font-bold text-gray-600 mt-1">{c.cpf}</p>
                                        </div>
                                    </div>
                                    {statusBadge(c.status_whatsapp, c.telefone)}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Score</p>
                                        <p className="text-xs font-black text-white">{c.score || '—'}</p>
                                    </div>
                                    <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Renda</p>
                                        <p className="text-xs font-black text-white">{c.renda ? `R$ ${c.renda.toLocaleString()}` : '—'}</p>
                                    </div>
                                </div>

                                {/* Telefones Ordenados */}
                                {c.telefone && (
                                    <div className="mb-6 space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                        {c.telefone.split(',')
                                            .map((t: string) => t.trim())
                                            .sort((a: string, b: string) => {
                                                const aIsWpp = a.includes('✅');
                                                const bIsWpp = b.includes('✅');
                                                if (aIsWpp && !bIsWpp) return -1;
                                                if (!aIsWpp && bIsWpp) return 1;
                                                return 0;
                                            })
                                            .slice(0, 3) // Mostra apenas os 3 primeiros para não poluir
                                            .map((telVal: string, idx: number) => {
                                                const hasWA = telVal.includes('✅')
                                                const num = telVal.replace(/[✅☎️📞❌]/g, '').trim()
                                                return (
                                                    <div key={idx} className="flex items-center justify-between text-[10px] bg-white/5 p-2 rounded-lg border border-white/5">
                                                        <span className="font-mono text-gray-400">{num}</span>
                                                        {hasWA && <span className="text-[8px] font-black text-emerald-400">WPP</span>}
                                                    </div>
                                                )
                                            })}
                                    </div>
                                )}

                                {/* Botão de Atribuição Dentro do Card */}
                                <div
                                    onClick={() => setAssigningId(isAssigning ? null : c.id)}
                                    className="bg-violet-500/5 hover:bg-violet-500/10 rounded-2xl p-4 border border-violet-500/10 cursor-pointer transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <UserCog size={16} className="text-violet-400" />
                                        <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Atribuir Ficha</span>
                                    </div>
                                    <ChevronDown size={14} className={`text-violet-400 transition-transform ${isAssigning ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Overlay de Seleção de Ligador */}
                                {isAssigning && (
                                    <div className="absolute inset-0 z-50 bg-[#0a0a0a] rounded-[2rem] p-4 animate-fade-in border-2 border-white/10 flex flex-col shadow-2xl">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Escolha o Ligador</span>
                                            <button onClick={() => setAssigningId(null)} className="p-1 hover:bg-white/10 rounded-lg transition-all"><X size={16} className="text-gray-500" /></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {ligadores.map(lig => (
                                                <button
                                                    key={lig.id}
                                                    onClick={() => handleAtribuir(c.id, lig.id)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left group/item"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-xs font-black text-white">
                                                        {lig.nome.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-300 group-hover/item:text-white">{lig.nome}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-700 uppercase tracking-tighter">Entrou: {new Date(c.created_at).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-violet-500 uppercase">Pendente</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                /* ABA DE ANDAMENTO - MONITORAMENTO (TABELA SEM OPÇÃO DE ATRIBUIR) */
                <div className="glass rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.01]">
                                    <th className="p-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Nome / CPF</th>
                                    <th className="p-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Telefone Principal</th>
                                    <th className="p-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Ligador Atribuído</th>
                                    <th className="p-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Banco</th>
                                    <th className="p-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Status Ficha</th>
                                    <th className="p-5 text-left text-[10px] font-black text-gray-600 uppercase tracking-widest">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leadsFiltrados.map((f) => {
                                    const ligNome = ligadores.find(l => l.id === f.atribuido_a)?.nome || '—'
                                    return (
                                        <tr key={f.id} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors">
                                            <td className="p-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white">{f.nome || 'Sem Nome'}</span>
                                                    <span className="text-[10px] font-mono font-bold text-gray-600">{f.cpf}</span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                {f.telefone ? (
                                                    <div className="flex items-center gap-2">
                                                        {f.telefone.split(',')
                                                            .map((t: string) => t.trim())
                                                            .sort((a: string, b: string) => {
                                                                const aIsWpp = a.includes('✅');
                                                                const bIsWpp = b.includes('✅');
                                                                if (aIsWpp && !bIsWpp) return -1;
                                                                if (!aIsWpp && bIsWpp) return 1;
                                                                return 0;
                                                            })[0] // Pega o principal (primeiro após sort)
                                                            .replace(/[✅☎️📞❌]/g, '').trim()}
                                                        {f.telefone.includes('✅') && (
                                                            <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">WPP</span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-gray-700">—</span>}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-[10px] font-black text-violet-400 border border-violet-500/20">
                                                        {ligNome.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-400">{ligNome}</span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className="text-[10px] font-black px-3 py-1 bg-white/5 text-gray-500 rounded-lg">{selectedBankName}</span>
                                            </td>
                                            <td className="p-5">
                                                {f.status_ficha === 'concluido_sucesso' ? (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase"><CheckCircle2 size={12} /> Sucesso</span>
                                                ) : f.status_ficha === 'concluido_erro' ? (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 uppercase"><XCircle size={12} /> Sem Sucesso</span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase"><Clock size={12} /> Pendente</span>
                                                )}
                                            </td>
                                            <td className="p-5 text-[10px] font-black text-gray-600">
                                                {new Date(f.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Paginação */}
            {!loading && totalPaginas > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-12 pb-10 animate-fade-in">
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest text-center md:text-left">
                        Página <span className="text-white">{pagina}</span> de <span className="text-white">{totalPaginas}</span>
                        <span className="mx-3 opacity-20">|</span>
                        Total de <span className="text-white">{totalRegistros}</span> fichas
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagina(p => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            className="glass px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all border-white/5"
                        >
                            Anterior
                        </button>

                        <div className="flex items-center gap-1 px-4 hidden sm:flex">
                            {[...Array(Math.min(5, totalPaginas))].map((_, i) => {
                                let pageNum = pagina;
                                if (totalPaginas <= 5) pageNum = i + 1;
                                else if (pagina <= 3) pageNum = i + 1;
                                else if (pagina >= totalPaginas - 2) pageNum = totalPaginas - 4 + i;
                                else pageNum = pagina - 2 + i;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPagina(pageNum)}
                                        className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${pagina === pageNum
                                            ? 'bg-white/10 text-white shadow-lg border border-white/20'
                                            : 'text-gray-600 hover:text-gray-400'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}
                        </div>

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

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
            `}</style>
        </div>
    )
}
