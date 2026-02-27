'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Smartphone, Phone, AlertTriangle, Filter, Trash2, X, AlertCircle, RefreshCw, Shield, XCircle, ArrowRight } from 'lucide-react'
import { supabase, Cliente, Banco } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function LeadsPage() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [bancos, setBancos] = useState<Banco[]>([])
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
    }, [filtroCheck, selectedBankId])

    useEffect(() => {
        carregarDados(pagina)
    }, [pagina])

    const carregarDados = async (page = 1) => {
        setLoading(true)
        const { data: bancosData } = await supabase.from('bancos').select('*').order('nome')
        if (bancosData) setBancos(bancosData)

        let query = supabase.from('clientes').select('*, bancos(nome)', { count: 'exact' }).order('created_at', { ascending: false })

        if (filtroCheck === 'check') query = query.eq('wpp_checked', true)
        if (filtroCheck === 'pendente') query = query.eq('wpp_checked', false)
        if (selectedBankId) query = query.eq('banco_principal_id', selectedBankId)

        const from = (page - 1) * ITENS_POR_PAGINA
        const to = from + ITENS_POR_PAGINA - 1
        query = query.range(from, to)

        const { data, count } = await query
        if (data) setClientes(data as any)
        if (count !== null) {
            setTotalRegistros(count)
            setTotalPaginas(Math.ceil(count / ITENS_POR_PAGINA))
        }
        setLoading(false)
    }

    const handleApagarUm = async (id: string) => {
        if (!confirm('Deseja realmente apagar este lead?')) return
        const { error } = await supabase.from('clientes').delete().eq('id', id)
        if (!error) setClientes(prev => prev.filter(c => c.id !== id))
    }

    const handleApagarTudo = async () => {
        setDeletingAll(true)
        let query = supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (selectedBankId) query = query.eq('banco_principal_id', selectedBankId)
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
        } catch (err) { console.error(err) }
        setClearingCheck(false)
    }

    const renderTelefones = (telString: string) => {
        if (!telString) return <span className="text-gray-700 italic text-xs">Sem telefone</span>
        const parts = telString.split(',').map(p => p.trim())
        return (
            <div className="flex flex-wrap gap-1.5">
                {parts.map((p, idx) => {
                    const hasWa = p.includes('✅')
                    const hasFail = p.includes('❌')
                    const numberOnly = p.replace(/[✅❌]/g, '').trim()
                    return (
                        <div key={idx} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold ${hasWa ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                hasFail ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                    'bg-white/5 border-white/5 text-gray-500'
                            }`}>
                            {numberOnly}
                            {hasWa && <Phone size={10} />}
                            {hasFail && <X size={10} />}
                        </div>
                    )
                })}
            </div>
        )
    }

    const clientesFiltrados = clientes.filter(c => {
        if (!busca) return true
        const b = busca.toLowerCase()
        return (c.cpf?.includes(b)) || (c.nome?.toLowerCase().includes(b)) || (c.telefone?.includes(b))
    })

    return (
        <div className="p-6 lg:p-10 animate-fade-in max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        Leads
                        {selectedBankName && <span className="text-xs not-italic font-bold px-3 py-1 rounded-full bg-white/5 text-gray-400 border border-white/5">{selectedBankName}</span>}
                    </h1>
                    <p className="text-gray-600 text-sm mt-1 font-medium italic">Gerenciamento centralizado de base de dados</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleLimparChecks} disabled={clearingCheck} className="px-5 py-2.5 glass rounded-xl text-xs font-black uppercase tracking-widest text-purple-400 hover:bg-purple-500/10 transition-all border-purple-500/10 flex items-center gap-2">
                        <RefreshCw size={14} className={clearingCheck ? 'animate-spin' : ''} /> Limpar Checks
                    </button>
                    <button onClick={() => setConfirmDeleteAll(true)} className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest border border-rose-500/20 flex items-center gap-2 transition-all">
                        <Trash2 size={14} /> Apagar Tudo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
                <div className="lg:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por nome, CPF ou telefone..." className="w-full pl-12 pr-4 py-4 glass rounded-2xl text-white placeholder-gray-700 font-medium focus:outline-none focus:ring-2 ring-purple-500/20 transition-all" />
                </div>
                <select value={filtroCheck} onChange={(e) => setFiltroCheck(e.target.value)} className="glass rounded-2xl px-5 py-4 text-white font-bold text-sm focus:outline-none appearance-none cursor-pointer border-white/5">
                    <option value="todos" className="bg-black">Todos os Leads</option>
                    <option value="check" className="bg-black">Apenas Checkados</option>
                    <option value="pendente" className="bg-black">Apenas Pendentes</option>
                </select>
                <div className="glass rounded-2xl px-6 py-4 flex items-center justify-between border-white/5">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Encontrados</span>
                    <span className="text-xl font-black text-white font-mono">{totalRegistros}</span>
                </div>
            </div>

            <div className="glass rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                {['Identificação', 'Contatos', 'Informações Financeiras', 'Status', 'Ações'].map(h => (
                                    <th key={h} className="text-left px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading ? (
                                <tr><td colSpan={5} className="py-20 text-center text-gray-700 italic">Carregando base de dados...</td></tr>
                            ) : clientesFiltrados.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-gray-700 italic">Nenhum registro encontrado nesta visualização.</td></tr>
                            ) : (
                                clientesFiltrados.map((c, i) => (
                                    <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">{i + 1 + (pagina - 1) * ITENS_POR_PAGINA}</div>
                                                <div>
                                                    <p className="text-sm font-black text-white uppercase tracking-tight">{c.nome || 'NOME NÃO INFORMADO'}</p>
                                                    <p className="text-[11px] font-mono text-gray-600 mt-0.5">{c.cpf}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">{renderTelefones(c.telefone || '')}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-6">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Renda Estimada</p>
                                                    <p className="text-xs font-bold text-emerald-400 font-mono">{c.renda ? `R$ ${c.renda.toLocaleString()}` : '—'}</p>
                                                </div>
                                                <div className="w-[1px] h-6 bg-white/5" />
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Score Serasa</p>
                                                    <p className="text-xs font-bold text-purple-400 font-mono">{c.score || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {c.wpp_checked ? (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20 italic">
                                                    <Shield size={12} fill="currentColor" className="opacity-20" /> VERIFICADO
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 text-gray-600 text-[10px] font-black border border-white/5 italic">
                                                    <RefreshCw size={12} /> AGUARDANDO
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <button onClick={() => handleApagarUm(c.id)} className="p-3 text-gray-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {!loading && totalPaginas > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-10 pb-10">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Mostrando página {pagina} de {totalPaginas}</p>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="px-8 py-4 glass rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white disabled:opacity-20 transition-all border-white/5">Anterior</button>
                        <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="px-8 py-4 glass rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white disabled:opacity-20 transition-all border-white/5 group">Próxima <ArrowRight size={14} className="inline ml-2 group-hover:translate-x-1 transition-transform" /></button>
                    </div>
                </div>
            )}

            {confirmDeleteAll && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                    <div className="glass rounded-[3rem] p-12 max-w-lg w-full border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/10 blurred-circle" />
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Atenção Crítica</h2>
                        <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">Você está prestes a apagar <b>TODOS</b> os registros desta base de dados. Esta operação é irreversível e afetará todos os processos em andamento.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmDeleteAll(false)} className="flex-1 px-8 py-5 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all">Cancelar</button>
                            <button onClick={handleApagarTudo} disabled={deletingAll} className="flex-1 px-8 py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">{deletingAll ? 'Processando...' : 'Excluir Absolutamente'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
