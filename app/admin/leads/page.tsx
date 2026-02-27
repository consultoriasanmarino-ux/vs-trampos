'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Smartphone, Phone, AlertTriangle, Filter, Trash2, X, AlertCircle, RefreshCw, Shield } from 'lucide-react'
import { supabase, Cliente, Banco } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function LeadsPage() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [bancos, setBancos] = useState<Banco[]>([])
    const [filtroWhatsapp, setFiltroWhatsapp] = useState<string>('todos')
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(true)
    const [deletingAll, setDeletingAll] = useState(false)
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

    // Paginação
    const [pagina, setPagina] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const [totalRegistros, setTotalRegistros] = useState(0)
    const ITENS_POR_PAGINA = 50

    useEffect(() => {
        setPagina(1)
        carregarDados(1)
    }, [filtroWhatsapp, selectedBankId])

    useEffect(() => {
        carregarDados(pagina)
    }, [pagina])

    const carregarDados = async (page = 1) => {
        setLoading(true)
        const { data: bancosData } = await supabase.from('bancos').select('*').order('nome')
        if (bancosData) setBancos(bancosData)

        let query = supabase.from('clientes').select('*, bancos(nome)', { count: 'exact' }).order('created_at', { ascending: false })

        if (filtroWhatsapp !== 'todos') query = query.eq('status_whatsapp', filtroWhatsapp)
        if (selectedBankId) query = query.eq('banco_principal_id', selectedBankId)

        const from = (page - 1) * ITENS_POR_PAGINA
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

    const handleApagarUm = async (id: string) => {
        if (!confirm('Deseja realmente apagar este lead?')) return

        const { error } = await supabase.from('clientes').delete().eq('id', id)
        if (!error) {
            setClientes(prev => prev.filter(c => c.id !== id))
        }
    }

    const handleApagarTudo = async () => {
        setDeletingAll(true)

        let query = supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Deleta tudo

        // Se tiver banco selecionado, apaga só desse banco
        if (selectedBankId) {
            query = query.eq('banco_principal_id', selectedBankId)
        }

        const { error } = await query

        if (!error) {
            setClientes([])
            setConfirmDeleteAll(false)
            alert('Todos os leads foram removidos do banco de dados com sucesso.')
        } else {
            alert('Erro ao apagar leads: ' + error.message)
        }

        setDeletingAll(false)
    }

    const clientesFiltrados = clientes.filter(c => {
        if (!busca) return true
        const termo = busca.toLowerCase()
        return c.cpf?.toLowerCase().includes(termo) || c.nome?.toLowerCase().includes(termo) || c.telefone?.includes(termo)
    })

    const statusIcon = (status: string | null, telefone: string | null) => {
        if (!status && telefone) return <RefreshCw size={14} className="text-purple-500 animate-spin" />
        switch (status) {
            case 'ativo': return <Smartphone size={14} className="text-green-500" />
            case 'fixo': return <Phone size={14} className="text-yellow-500" />
            case 'invalido': return <AlertTriangle size={14} className="text-red-500" />
            default: return <span className="w-3 h-3 rounded-full bg-gray-800 inline-block" />
        }
    }

    const statusLabel = (status: string | null, telefone: string | null) => {
        if (!status && telefone) return 'Analisando...'
        switch (status) {
            case 'ativo': return 'WhatsApp'
            case 'fixo': return 'Fixo'
            case 'invalido': return 'Inválido'
            default: return 'Sem info'
        }
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Leads</h1>
                    <p className="text-gray-600 text-sm mt-1">Visualize e gerencie seus leads importados.</p>
                </div>

                {clientes.length > 0 && (
                    <button
                        onClick={() => setConfirmDeleteAll(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all text-sm font-semibold border border-red-500/20"
                    >
                        <Trash2 size={16} />
                        Apagar Tudo {selectedBankId ? `(${selectedBankName})` : ''}
                    </button>
                )}
            </div>

            {/* Modal de Confirmação para Apagar Tudo */}
            {confirmDeleteAll && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-strong rounded-3xl p-8 max-w-md w-full border border-white/10 animate-scale-in shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle size={32} className="text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white text-center mb-2">Tem certeza absoluta?</h2>
                        <p className="text-gray-400 text-center text-sm mb-8 leading-relaxed">
                            Você está prestes a apagar <b>TODOS</b> os leads
                            {selectedBankId ? <> do banco <b>{selectedBankName}</b></> : ' do sistema'}.
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteAll(false)}
                                className="flex-1 px-6 py-3.5 glass rounded-xl text-white text-sm font-bold hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApagarTudo}
                                disabled={deletingAll}
                                className="flex-1 px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
                            >
                                {deletingAll ? 'Apagando...' : 'Sim, Apagar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-3 mb-6 animate-fade-in-up stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por CPF, nome ou telefone..."
                        className="w-full pl-10 pr-4 py-3 glass rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                        style={{ '--tw-ring-color': `rgba(${theme.primaryRGB}, 0.4)` } as any}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-600" />
                    <select
                        value={filtroWhatsapp}
                        onChange={(e) => setFiltroWhatsapp(e.target.value)}
                        className="glass rounded-xl px-4 py-3 text-white text-sm focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="todos" className="bg-[#111]">Todos Status</option>
                        <option value="ativo" className="bg-[#111]">WhatsApp Ativo</option>
                        <option value="fixo" className="bg-[#111]">Telefone Fixo</option>
                        <option value="invalido" className="bg-[#111]">Inválido</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <Users size={14} className="text-gray-600" />
                <span className="text-xs text-gray-500 font-medium">{clientesFiltrados.length} lead(s) encontrado(s)</span>
            </div>

            <div className="glass rounded-2xl overflow-hidden animate-fade-in-up stagger-2">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.04]">
                                {['CPF', 'Nome', 'Banco', 'BIN', 'Validade', 'Telefone', 'Status', 'Check', 'Ações'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="text-center py-12 text-gray-600 text-sm">Carregando...</td></tr>
                            ) : clientesFiltrados.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-12 text-gray-600 text-sm">Nenhum lead encontrado.</td></tr>
                            ) : (
                                clientesFiltrados.map((c, i) => (
                                    <tr
                                        key={c.id}
                                        className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors animate-fade-in"
                                        style={{ animationDelay: `${i * 0.02}s` }}
                                    >
                                        <td className="px-5 py-3.5 text-sm text-white font-mono">{c.cpf}</td>
                                        <td className="px-5 py-3.5 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-gray-300 font-medium">{c.nome || '—'}</span>
                                                <span className="text-[10px] text-gray-600">
                                                    {c.renda ? `R$ ${c.renda.toLocaleString()}` : ''}
                                                    {c.score ? ` • Score: ${c.score}` : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-gray-400">{(c.bancos as any)?.nome || '—'}</td>
                                        <td className="px-5 py-3.5 text-sm">
                                            <span className={`font-mono ${c.bin_cartao ? 'text-purple-400' : 'text-gray-700'}`}>
                                                {c.bin_cartao || 'Sem info'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm">
                                            <span className={`${c.validade_cartao ? 'text-cyan-400' : 'text-gray-700'}`}>
                                                {c.validade_cartao || 'Sem info'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-gray-300 font-mono">{c.telefone || '—'}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                {statusIcon(c.status_whatsapp, c.telefone)}
                                                <span className="text-xs text-gray-400">{statusLabel(c.status_whatsapp, c.telefone)}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {c.wpp_checked ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20">
                                                    <Shield size={10} /> CHECK
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-gray-600 text-[10px] font-black border border-white/5">
                                                    <RefreshCw size={10} /> PENDENTE
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <button
                                                onClick={() => handleApagarUm(c.id)}
                                                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Paginação */}
            {!loading && totalPaginas > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-8 pb-10">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                        Página <span className="text-white">{pagina}</span> de <span className="text-white">{totalPaginas}</span>
                        <span className="mx-3 opacity-20">|</span>
                        Total de <span className="text-white">{totalRegistros}</span> leads
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagina(p => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            className="glass px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all border-white/5"
                        >
                            Anterior
                        </button>

                        <button
                            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                            disabled={pagina === totalPaginas}
                            className="glass px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all border-white/5"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
