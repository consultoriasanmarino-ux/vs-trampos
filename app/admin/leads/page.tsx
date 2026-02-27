'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Smartphone, Phone, AlertTriangle, Filter, Trash2, X, AlertCircle, RefreshCw, Shield, XCircle } from 'lucide-react'
import { supabase, Cliente, Banco } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function LeadsPage() {
    const renderTelefones = (telString: string) => {
        if (!telString || telString === '—') return '—'

        const parts = telString.split(',').map(p => p.trim())

        return (
            <div className="flex flex-wrap gap-2 max-w-[300px]">
                {parts.map((p, idx) => {
                    const hasWa = p.includes('✅')
                    const hasFail = p.includes('❌')
                    const numberOnly = p.replace(/[✅❌]/g, '').trim()

                    return (
                        <div key={idx} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-lg">
                            <span className={`text-[11px] font-mono ${hasWa ? 'text-emerald-400' : hasFail ? 'text-rose-400' : 'text-gray-400'}`}>
                                {numberOnly}
                            </span>
                            {hasWa && <Phone size={10} className="text-emerald-500 fill-emerald-500/20" />}
                            {hasFail && <XCircle size={10} className="text-rose-500" />}
                        </div>
                    )
                })}
            </div>
        )
    }

    const { theme, selectedBankId, selectedBankName } = useBankTheme()
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [bancos, setBancos] = useState<Banco[]>([])
    const [filtroWhatsapp, setFiltroWhatsapp] = useState<string>('todos')
    const [filtroCheck, setFiltroCheck] = useState<string>('todos')
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(true)
    const [deletingAll, setDeletingAll] = useState(false)
    const [clearingCheck, setClearingCheck] = useState(false)
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

    // Paginação
    const [pagina, setPagina] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const [totalRegistros, setTotalRegistros] = useState(0)
    const ITENS_POR_PAGINA = 50

    useEffect(() => {
        setPagina(1)
        carregarDados(1)
    }, [filtroWhatsapp, filtroCheck, selectedBankId])

    useEffect(() => {
        carregarDados(pagina)
    }, [pagina])

    const carregarDados = async (page = 1) => {
        setLoading(true)
        const { data: bancosData } = await supabase.from('bancos').select('*').order('nome')
        if (bancosData) setBancos(bancosData)

        let query = supabase.from('clientes').select('*, bancos(nome)', { count: 'exact' }).order('created_at', { ascending: false })

        if (filtroWhatsapp !== 'todos') query = query.eq('status_whatsapp', filtroWhatsapp)
        if (filtroCheck === 'check') query = query.eq('wpp_checked', true)
        if (filtroCheck === 'pendente') query = query.eq('wpp_checked', false)
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

        if (selectedBankId) {
            query = query.eq('banco_principal_id', selectedBankId)
        }

        const { error } = await query

        if (!error) {
            setClientes([])
            setTotalRegistros(0)
            setTotalPaginas(1)
            setConfirmDeleteAll(false)
        }
        setDeletingAll(false)
    }

    const handleLimparChecks = async () => {
        setClearingCheck(true)
        try {
            let query = supabase.from('clientes').select('id, telefone')
            if (selectedBankId) query = query.eq('banco_principal_id', selectedBankId)

            const { data } = await query
            if (data) {
                const batchSize = 100
                for (let i = 0; i < data.length; i += batchSize) {
                    const batch = data.slice(i, i + batchSize)
                    const updates = batch.map(c => ({
                        id: c.id,
                        wpp_checked: false,
                        telefone: c.telefone ? c.telefone.replace(/[✅❌]/g, '').trim() : null
                    }))
                    await supabase.from('clientes').upsert(updates)
                }
                carregarDados(pagina)
            }
        } catch (err) {
            console.error('Erro ao limpar checks:', err)
        }
        setClearingCheck(false)
    }

    const statusLabel = (status: string, tel: string) => {
        if (tel && (tel.includes('✅'))) return 'WhatsApp Encontrado'
        if (tel && (tel.includes('❌'))) return 'Apenas Fixo / Inválido'
        if (status === 'ativo') return 'WhatsApp Ativo'
        if (status === 'fixo') return 'Telefone Fixo'
        if (status === 'invalido') return 'Inválido'
        return 'Não consultado'
    }

    const statusIcon = (status: string, tel: string) => {
        const hasWa = tel && tel.includes('✅')
        const hasFail = tel && tel.includes('❌')

        if (hasWa) return <Phone size={14} className="text-emerald-500" />
        if (hasFail) return <X size={14} className="text-rose-500" />
        if (status === 'ativo') return <Phone size={14} className="text-emerald-500" />
        if (status === 'invalido' || status === 'fixo') return <X size={14} className="text-rose-500" />
        return < Smartphone size={14} className="text-gray-600" />
    }

    const clientesFiltrados = clientes.filter(c => {
        if (!busca) return true
        const b = busca.toLowerCase()
        return (
            (c.cpf && c.cpf.includes(b)) ||
            (c.nome && c.nome.toLowerCase().includes(b)) ||
            (c.telefone && c.telefone.includes(b))
        )
    })

    return (
        <div className="p-6 md:p-10 animate-fade-in max-w-[1600px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Leads</h1>
                    <p className="text-gray-600 text-sm mt-1">Visualize e gerencie seus leads importados.</p>
                </div>

                <div className="flex items-center gap-2">
                    {clientes.length > 0 && (
                        <button
                            onClick={handleLimparChecks}
                            disabled={clearingCheck}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-xl transition-all text-sm font-semibold border border-purple-500/20 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={clearingCheck ? 'animate-spin' : ''} />
                            Limpar Checks
                        </button>
                    )}

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

                    <select
                        value={filtroCheck}
                        onChange={(e) => setFiltroCheck(e.target.value)}
                        className="glass rounded-xl px-4 py-3 text-white text-sm focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="todos" className="bg-[#111]">Todos Check</option>
                        <option value="check" className="bg-[#111]">Somente Checkados</option>
                        <option value="pendente" className="bg-[#111]">Somente Pendentes</option>
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
                                        <td className="px-5 py-3.5 text-sm">{renderTelefones(c.telefone || '')}</td>
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
            {
                !loading && totalPaginas > 1 && (
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
                )
            }
        </div >
    )
}
