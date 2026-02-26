'use client'

import { useState, useEffect } from 'react'
import {
    Users, Search, Smartphone, Phone, AlertTriangle,
    CreditCard, TrendingUp, Star, Filter, RefreshCw,
    Calendar, UserCheck, ShieldCheck, MapPin, DollarSign,
    ExternalLink, Trash2
} from 'lucide-react'
import { supabase, Cliente, Banco } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function FichasAdminPage() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()
    const [leads, setLeads] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [filtroStatus, setFiltroStatus] = useState('todos')
    const [filtroLigador, setFiltroLigador] = useState('todos')
    const [ligadores, setLigadores] = useState<{ id: string, nome: string }[]>([])

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
        let query = supabase
            .from('clientes')
            .select('*, bancos(nome), usuarios:atribuido_a(nome)')
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

        const { data } = await query
        if (data) setLeads(data)
        setLoading(false)
    }

    const leadsFiltrados = leads.filter(c => {
        if (!busca) return true
        const termo = busca.toLowerCase()
        return c.cpf?.toLowerCase().includes(termo) ||
            c.nome?.toLowerCase().includes(termo) ||
            c.telefone?.includes(termo)
    })

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
                    <p className="text-gray-600 text-sm mt-1">Visão organizada e completa de todos os leads.</p>
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
                        {ligadores.slice(0, 3).map((l, i) => (
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
                    {leadsFiltrados.map((c, i) => (
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
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="glass-light rounded-2xl p-3 border border-white/[0.03]">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <DollarSign size={12} className="text-emerald-500" />
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Renda Estimada</span>
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
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Nascimento</span>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-tight">{c.data_nascimento || '—'}</p>
                                </div>
                                <div className="glass-light rounded-2xl p-3 border border-white/[0.03]">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <ShieldCheck size={12} className="text-blue-500" />
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Atribuído a</span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 truncate">
                                        {c.atribuido_a ? (c as any).usuarios?.nome : 'Não atribuído'}
                                    </p>
                                </div>
                            </div>

                            {/* Phone Area */}
                            <div className="bg-white/[0.02] rounded-2xl p-4 flex items-center justify-between border border-white/[0.04] transition-all group-hover:bg-white/[0.04]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gray-900">
                                        <Phone size={14} className="text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-700 uppercase mb-0.5">Telefone Principal</p>
                                        <p className="text-xs font-mono font-bold text-gray-400 tracking-wider">
                                            {c.telefone || 'Aguardando enriquecer...'}
                                        </p>
                                    </div>
                                </div>
                                {c.telefone && c.status_whatsapp === 'ativo' && (
                                    <a
                                        href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/10"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>

                            {/* Footer interactions */}
                            <div className="mt-5 pt-5 border-t border-white/[0.04] flex items-center justify-between">
                                <span className="text-[9px] font-medium text-gray-700">Criado em: {new Date(c.created_at).toLocaleDateString()}</span>
                                <div className="flex items-center gap-2">
                                    <button className="p-2 glass rounded-lg text-gray-600 hover:text-white transition-all">
                                        <Filter size={14} />
                                    </button>
                                    <button className="p-2 glass rounded-lg text-gray-600 hover:text-red-500 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
