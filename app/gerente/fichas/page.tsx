'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Search, RefreshCw, UserPlus, CheckCircle2, XCircle, Clock, Users, Filter, ChevronDown } from 'lucide-react'
import { supabase, Cliente, Ligador } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function GerenteFichas() {
    const { theme, selectedBankId } = useBankTheme()
    const [fichas, setFichas] = useState<Cliente[]>([])
    const [ligadores, setLigadores] = useState<Ligador[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [filtroStatus, setFiltroStatus] = useState<string>('todos')
    const [filtroAtribuicao, setFiltroAtribuicao] = useState<string>('todos')

    // Seleção múltipla
    const [selecionados, setSelecionados] = useState<string[]>([])
    const [ligadorParaAtribuir, setLigadorParaAtribuir] = useState<string>('')

    useEffect(() => {
        if (selectedBankId) {
            carregarDados()
        }
    }, [selectedBankId])

    const carregarDados = async () => {
        setLoading(true)
        const { data: fichasData } = await supabase.from('clientes').select('*').eq('banco_principal_id', selectedBankId!).order('created_at', { ascending: false })
        const { data: ligadoresData } = await supabase.from('ligadores').select('*').order('nome')
        if (fichasData) setFichas(fichasData)
        if (ligadoresData) setLigadores(ligadoresData)
        setLoading(false)
    }

    const fichasFiltradas = fichas.filter(f => {
        if (busca) {
            const termo = busca.toLowerCase()
            if (!f.cpf?.includes(termo) && !f.nome?.toLowerCase().includes(termo)) return false
        }
        if (filtroStatus === 'pendente' && f.status_ficha) return false
        if (filtroStatus === 'sucesso' && f.status_ficha !== 'concluido_sucesso') return false
        if (filtroStatus === 'erro' && f.status_ficha !== 'concluido_erro') return false
        if (filtroAtribuicao === 'sem_atribuicao' && f.atribuido_a) return false
        if (filtroAtribuicao === 'com_atribuicao' && !f.atribuido_a) return false
        return true
    })

    const toggleSelecionado = (id: string) => {
        setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const selecionarTodos = () => {
        if (selecionados.length === fichasFiltradas.length) {
            setSelecionados([])
        } else {
            setSelecionados(fichasFiltradas.map(f => f.id))
        }
    }

    const atribuirSelecionados = async () => {
        if (!ligadorParaAtribuir || selecionados.length === 0) return
        setLoading(true)

        let erros = 0
        for (const id of selecionados) {
            const { error } = await supabase.from('clientes').update({ atribuido_a: ligadorParaAtribuir }).eq('id', id)
            if (error) {
                console.error(`Erro ao atribuir ${id}:`, error)
                erros++
            }
        }

        if (erros > 0) {
            alert(`Atenção: ${erros} fichas não puderam ser atribuídas. Verifique se o ligador existe e se a Foreign Key está correta.`)
        } else {
            alert(`${selecionados.length} fichas atribuídas com sucesso!`)
        }

        setSelecionados([])
        setLigadorParaAtribuir('')
        carregarDados()
    }

    const getLigadorNome = (id: string | null) => {
        if (!id) return null
        return ligadores.find(l => l.id === id)?.nome || null
    }

    const fichaStatusBadge = (status: string | null) => {
        switch (status) {
            case 'concluido_sucesso': return <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-bold"><CheckCircle2 size={9} /> SUCESSO</span>
            case 'concluido_erro': return <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-full text-[9px] font-bold"><XCircle size={9} /> SEM SUCESSO</span>
            default: return <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[9px] font-bold"><Clock size={9} /> PENDENTE</span>
        }
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Fichas</h1>
                    <p className="text-gray-600 text-sm mt-1">Gerencie e atribua fichas aos ligadores</p>
                </div>
                <button onClick={carregarDados} className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-gray-400 hover:text-white transition-all text-sm">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
                </button>
            </div>

            {/* Filtros e busca */}
            <div className="glass rounded-2xl p-4 mb-6 border border-white/5">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou CPF..." className="w-full bg-[#080808] border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': theme.primary + '33' } as any} />
                    </div>
                    <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-[#080808] border border-white/5 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none cursor-pointer">
                        <option value="todos">Todos os Status</option>
                        <option value="pendente">Pendentes</option>
                        <option value="sucesso">Sucesso</option>
                        <option value="erro">Sem Sucesso</option>
                    </select>
                    <select value={filtroAtribuicao} onChange={e => setFiltroAtribuicao(e.target.value)} className="bg-[#080808] border border-white/5 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none cursor-pointer">
                        <option value="todos">Todos</option>
                        <option value="sem_atribuicao">Sem Ligador</option>
                        <option value="com_atribuicao">Com Ligador</option>
                    </select>
                </div>
            </div>

            {/* Barra de atribuição */}
            {selecionados.length > 0 && (
                <div className="glass rounded-2xl p-4 mb-6 border border-white/5 flex flex-wrap items-center gap-4 animate-fade-in-up" style={{ borderColor: theme.primary + '33' }}>
                    <p className="text-sm font-bold text-white">{selecionados.length} ficha(s) selecionada(s)</p>
                    <select value={ligadorParaAtribuir} onChange={e => setLigadorParaAtribuir(e.target.value)} className="bg-[#080808] border border-white/5 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none cursor-pointer flex-1 min-w-[150px]">
                        <option value="">Selecione um ligador...</option>
                        {ligadores.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                    </select>
                    <button onClick={atribuirSelecionados} disabled={!ligadorParaAtribuir} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}88)` }}>
                        <UserPlus size={16} /> Atribuir
                    </button>
                </div>
            )}

            {/* Stats rápidos */}
            <div className="flex gap-3 mb-6 text-[10px] font-bold text-gray-600 uppercase">
                <span className="px-3 py-1.5 glass rounded-lg">{fichasFiltradas.length} fichas</span>
                <span className="px-3 py-1.5 bg-emerald-500/5 rounded-lg text-emerald-500">{fichas.filter(f => f.status_ficha === 'concluido_sucesso').length} ✓ sucesso</span>
                <span className="px-3 py-1.5 bg-rose-500/5 rounded-lg text-rose-500">{fichas.filter(f => f.status_ficha === 'concluido_erro').length} ✕ sem sucesso</span>
                <span className="px-3 py-1.5 bg-amber-500/5 rounded-lg text-amber-500">{fichas.filter(f => !f.status_ficha).length} ● pendentes</span>
            </div>

            {/* Tabela */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="p-3 text-left">
                                    <input type="checkbox" checked={selecionados.length === fichasFiltradas.length && fichasFiltradas.length > 0} onChange={selecionarTodos} className="rounded accent-violet-500" />
                                </th>
                                <th className="p-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Nome</th>
                                <th className="p-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">CPF</th>
                                <th className="p-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Telefone</th>
                                <th className="p-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="p-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Ligador</th>
                                <th className="p-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fichasFiltradas.slice(0, 100).map((f) => {
                                const ligNome = getLigadorNome(f.atribuido_a)
                                return (
                                    <tr key={f.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${selecionados.includes(f.id) ? 'bg-white/[0.04]' : ''}`}>
                                        <td className="p-3">
                                            <input type="checkbox" checked={selecionados.includes(f.id)} onChange={() => toggleSelecionado(f.id)} className="rounded accent-violet-500" />
                                        </td>
                                        <td className="p-3 text-sm font-medium text-white">{f.nome || '—'}</td>
                                        <td className="p-3 text-sm font-mono text-gray-500">{f.cpf}</td>
                                        <td className="p-3 text-sm text-gray-400">{f.telefone || '—'}</td>
                                        <td className="p-3">{fichaStatusBadge(f.status_ficha)}</td>
                                        <td className="p-3">
                                            {ligNome ? (
                                                <span className="text-xs font-bold text-white px-2 py-1 rounded-lg" style={{ background: `rgba(${theme.primaryRGB}, 0.1)` }}>{ligNome}</span>
                                            ) : (
                                                <span className="text-xs text-gray-700 italic">Não atribuída</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs text-gray-500 max-w-[150px] truncate">{f.motivo_conclusao || '—'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {fichasFiltradas.length === 0 && !loading && (
                    <div className="text-center py-16">
                        <CreditCard className="mx-auto text-gray-800 mb-4" size={40} />
                        <p className="text-gray-500 text-sm font-medium">Nenhuma ficha encontrada</p>
                    </div>
                )}
            </div>
        </div>
    )
}
