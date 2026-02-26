'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Users, Search, Smartphone, Phone, AlertTriangle,
    Star, Filter, RefreshCw, Calendar, UserCheck,
    ShieldCheck, DollarSign, ExternalLink, Trash2,
    ChevronDown, Check, X
} from 'lucide-react'
import { supabase, Cliente, Banco } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function FichasAdminPage() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()
    const [leads, setLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [filtroStatus, setFiltroStatus] = useState('todos')
    const [filtroLigador, setFiltroLigador] = useState('todos')
    const [ligadores, setLigadores] = useState<{ id: string, nome: string }[]>([])
    const [assigningId, setAssigningId] = useState<string | null>(null)

    useEffect(() => {
        carregarLigadores()
    }, [])

    useEffect(() => {
        carregarFichas()
    }, [selectedBankId, filtroStatus, filtroLigador])

    const carregarLigadores = async () => {
        const { data } = await supabase.from('usuarios').select('id, nome').eq('role', 'ligador')
        if (data) setLigadores(data)
    }

    const carregarFichas = async () => {
        setLoading(true)
        // Query simples sem JOIN problemático
        let query = supabase
            .from('clientes')
            .select('*, bancos(nome)')
            .order('created_at', { ascending: false })

        if (selectedBankId) {
            query = query.eq('banco_principal_id', selectedBankId)
        }

        if (filtroStatus !== 'todos') {
            query = query.eq('status_whatsapp', filtroStatus)
        }

        if (filtroLigador === 'nenhum') {
            query = query.is('atribuido_a', null)
        } else if (filtroLigador !== 'todos') {
            query = query.eq('atribuido_a', filtroLigador)
        }

        const { data, error } = await query
        if (error) {
            console.error('Erro ao carregar fichas:', error)
        }
        if (data) setLeads(data)
        setLoading(false)
    }

    const handleAtribuir = async (clienteId: string, ligadorId: string | null) => {
        const { error } = await supabase
            .from('clientes')
            .update({ atribuido_a: ligadorId })
            .eq('id', clienteId)

        if (!error) {
            setLeads(prev => prev.map(l =>
                l.id === clienteId ? { ...l, atribuido_a: ligadorId } : l
            ))
        }
        setAssigningId(null)
    }

    const handleDeletar = async (id: string) => {
        if (!confirm('Deseja realmente apagar esta ficha?')) return
        const { error } = await supabase.from('clientes').delete().eq('id', id)
        if (!error) {
            setLeads(prev => prev.filter(l => l.id !== id))
        }
    }

    const leadsFiltrados = leads.filter(c => {
        if (!busca) return true
        const termo = busca.toLowerCase()
        return c.cpf?.toLowerCase().includes(termo) ||
            c.nome?.toLowerCase().includes(termo) ||
            c.telefone?.includes(termo)
    })

    const getNomeLigador = (id: string | null) => {
        if (!id) return null
        const lig = ligadores.find(l => l.id === id)
        return lig?.nome || null
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

    // Formata data ISO (YYYY-MM-DD) para BR (DD/MM/YYYY)
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (parts) return `${parts[3]}/${parts[2]}/${parts[1]}`
        return dateStr
    }

    return (
        <div className="p-6 lg:p-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        Fichas Detalhadas
                        {selectedBankName && (
                            <span
                                className="text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider"
                                style={{
                                    background: `rgba(${theme.primaryRGB}, 0.1)`,
                                    color: theme.primary,
                                    border: `1px solid rgba(${theme.primaryRGB}, 0.2)`
                                }}
                            >
                                {selectedBankName}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-600 text-sm mt-1">
                        {leadsFiltrados.length} ficha(s) • Clique em "Atribuir" para enviar ao Ligador
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={carregarFichas}
                        className="glass p-2.5 rounded-xl text-gray-400 hover:text-white transition-all group"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                    </button>
                    <div className="h-10 w-[1px] bg-white/5 mx-1" />
                    <div className="flex -space-x-2">
                        {ligadores.slice(0, 3).map((l) => (
                            <div key={l.id} className="w-8 h-8 rounded-full border-2 border-[#030303] bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
                                {l.nome.charAt(0)}
                            </div>
                        ))}
                        {ligadores.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-[#030303] bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                +{ligadores.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
                <div className="relative col-span-1 md:col-span-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome, CPF ou celular..."
                        className="w-full pl-10 pr-4 py-3 glass rounded-2xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 transition-all"
                        style={{ '--tw-ring-color': `rgba(${theme.primaryRGB}, 0.4)` } as any}
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                    <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 glass rounded-2xl text-white text-sm focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="todos" className="bg-[#111]">Todos Status</option>
                        <option value="ativo" className="bg-[#111]">WhatsApp</option>
                        <option value="fixo" className="bg-[#111]">Fixo</option>
                        <option value="invalido" className="bg-[#111]">Inválido</option>
                    </select>
                </div>

                <div className="relative">
                    <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                    <select
                        value={filtroLigador}
                        onChange={(e) => setFiltroLigador(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 glass rounded-2xl text-white text-sm focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="todos" className="bg-[#111]">Todos Ligadores</option>
                        <option value="nenhum" className="bg-[#111]">Não atribuídos</option>
                        {ligadores.map(l => (
                            <option key={l.id} value={l.id} className="bg-[#111]">{l.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid display */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                    <RefreshCw size={32} className="animate-spin mb-4" />
                    <p className="text-sm font-medium">Carregando fichas detalhadas...</p>
                </div>
            ) : leadsFiltrados.length === 0 ? (
                <div className="text-center py-24 glass rounded-3xl border border-dashed border-white/5">
                    <Users className="mx-auto text-gray-800 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Nenhuma ficha encontrada com estes filtros.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {leadsFiltrados.map((c, i) => {
                        const nomeLigador = getNomeLigador(c.atribuido_a)
                        const isAssigning = assigningId === c.id

                        return (
                            <div
                                key={c.id}
                                className="glass rounded-3xl p-6 card-hover animate-fade-in-up relative overflow-hidden group border border-white/5"
                                style={{ animationDelay: `${i * 0.03}s` }}
                            >
                                {/* Accent overlay */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/[0.05] to-transparent rounded-bl-full pointer-events-none" />

                                {/* Top header of card */}
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-2xl transition-all duration-500 group-hover:scale-110"
                                            style={{
                                                background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.3), rgba(${theme.primaryRGB}, 0.1))`,
                                                color: theme.primary,
                                                border: `1px solid rgba(${theme.primaryRGB}, 0.2)`
                                            }}
                                        >
                                            {c.nome ? c.nome.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white group-hover:text-violet-400 transition-colors">{c.nome || 'Sem Nome'}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] font-mono text-gray-500">{c.cpf}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                                <span className="text-[10px] font-bold text-gray-600 uppercase">{(c.bancos as any)?.nome}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {statusBadge(c.status_whatsapp, c.telefone)}
                                </div>

                                {/* Info Grid - 2x2 */}
                                <div className="grid grid-cols-2 gap-3 mb-5">
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
                                        <p className="text-sm font-bold text-white tracking-tight">{formatDate(c.data_nascimento)}</p>
                                    </div>

                                    {/* Atribuição - clicável */}
                                    <div className="glass-light rounded-2xl p-3 border border-white/[0.03] relative">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <ShieldCheck size={12} className="text-blue-500" />
                                            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Ligador</span>
                                        </div>
                                        <button
                                            onClick={() => setAssigningId(isAssigning ? null : c.id)}
                                            className="text-xs font-bold text-left w-full flex items-center justify-between gap-1 hover:text-violet-400 transition-colors"
                                            style={{ color: nomeLigador ? theme.primary : '#666' }}
                                        >
                                            <span className="truncate">{nomeLigador || 'Atribuir →'}</span>
                                            <ChevronDown size={10} className={`transition-transform ${isAssigning ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Dropdown de Ligadores */}
                                        {isAssigning && (
                                            <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-strong rounded-xl p-1.5 shadow-2xl border border-white/10 animate-fade-in-up">
                                                {/* Desatribuir */}
                                                {c.atribuido_a && (
                                                    <button
                                                        onClick={() => handleAtribuir(c.id, null)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-all font-medium"
                                                    >
                                                        <X size={12} /> Remover atribuição
                                                    </button>
                                                )}
                                                {ligadores.map(lig => (
                                                    <button
                                                        key={lig.id}
                                                        onClick={() => handleAtribuir(c.id, lig.id)}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all font-medium ${c.atribuido_a === lig.id
                                                            ? 'text-violet-400 bg-violet-500/10'
                                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                                                            {lig.nome.charAt(0)}
                                                        </div>
                                                        {lig.nome}
                                                        {c.atribuido_a === lig.id && <Check size={12} className="ml-auto" />}
                                                    </button>
                                                ))}
                                                {ligadores.length === 0 && (
                                                    <p className="px-3 py-2 text-[10px] text-gray-600">Nenhum ligador cadastrado</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Phone Area - todos os telefones */}
                                <div className="space-y-2">
                                    {c.telefone ? (
                                        c.telefone.split(',').map((tel: string, idx: number) => {
                                            const telClean = tel.trim()
                                            return (
                                                <div key={idx} className="bg-white/[0.02] rounded-xl p-3 flex items-center justify-between border border-white/[0.04] transition-all hover:bg-white/[0.04]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 rounded-lg bg-gray-900">
                                                            <Phone size={12} className="text-gray-500" />
                                                        </div>
                                                        <p className="text-xs font-mono font-bold text-gray-400 tracking-wider">{telClean}</p>
                                                    </div>
                                                    {c.status_whatsapp === 'ativo' && idx === 0 && (
                                                        <a
                                                            href={`https://wa.me/55${telClean.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all"
                                                        >
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="bg-white/[0.01] rounded-xl p-3 flex items-center gap-3 border border-white/[0.03] opacity-50">
                                            <div className="p-1.5 rounded-lg bg-gray-900">
                                                <Phone size={12} className="text-gray-700" />
                                            </div>
                                            <p className="text-xs font-medium text-gray-600 italic">Aguardando enriquecimento</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                                    <span className="text-[9px] font-medium text-gray-700">
                                        {new Date(c.created_at).toLocaleDateString()}
                                    </span>
                                    <button
                                        onClick={() => handleDeletar(c.id)}
                                        className="p-2 glass rounded-lg text-gray-600 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
