'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Users, Search, Smartphone, Phone, AlertTriangle,
    Star, Filter, RefreshCw, Calendar, UserCheck,
    ShieldCheck, DollarSign, ExternalLink, Trash2,
    ChevronDown, Check, X, UserCog
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
        const { data } = await supabase.from('ligadores').select('id, nome')
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
        // Mostra animação de 'processando' localmente se quiser, mas aqui vamos direto ao ponto
        const { error } = await supabase
            .from('clientes')
            .update({ atribuido_a: ligadorId })
            .eq('id', clienteId)

        if (!error) {
            // Remove a ficha da lista após atribuir (conforme solicitado: "a ficha tem que sumir dali")
            setLeads(prev => prev.filter(l => l.id !== clienteId))
            setAssigningId(null)
        }
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
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] font-bold border border-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <RefreshCw size={12} className="animate-spin" /> ANALISANDO...
                </span>
            )
        }
        switch (status) {
            case 'ativo':
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <Smartphone size={12} /> WHATSAPP
                    </span>
                )
            case 'fixo':
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <Phone size={12} /> FIXO
                    </span>
                )
            case 'invalido':
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-bold border border-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                        <AlertTriangle size={12} /> INVÁLIDO
                    </span>
                )
            default:
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-500 rounded-lg text-[10px] font-bold border border-white/10">
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
        <div className="p-6 lg:p-10 animate-fade-in relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                <div className="animate-slide-in-left">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-4">
                        Fichas Detalhadas
                        {selectedBankName && (
                            <div className="relative group">
                                <span
                                    className="text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest bg-gradient-to-r from-white/10 to-transparent border border-white/10 shadow-2xl"
                                    style={{ color: theme.primary }}
                                >
                                    {selectedBankName}
                                </span>
                                <div
                                    className="absolute -inset-1 blur-lg opacity-30 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none"
                                    style={{ backgroundColor: theme.primary }}
                                />
                            </div>
                        )}
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">
                        {leadsFiltrados.length === 0 ? 'Nenhuma ficha disponível' : `${leadsFiltrados.length} ficha(s) pendentes de ação`}
                    </p>
                </div>

                <div className="flex items-center gap-4 animate-slide-in-right">
                    <button
                        onClick={carregarFichas}
                        className="glass p-3.5 rounded-2xl text-gray-400 hover:text-white hover:scale-110 active:scale-95 transition-all group border-white/10"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                    </button>
                    <div className="h-10 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent mx-2" />
                    <div className="flex -space-x-3">
                        {ligadores.slice(0, 4).map((l, idx) => (
                            <div
                                key={l.id}
                                className="w-10 h-10 rounded-2xl border-2 border-[#030303] flex items-center justify-center text-xs font-black text-white shadow-xl relative group transform hover:-translate-y-1 transition-transform"
                                style={{
                                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary + '88'})`,
                                    zIndex: 10 + idx
                                }}
                            >
                                {l.nome.charAt(0).toUpperCase()}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    {l.nome}
                                </div>
                            </div>
                        ))}
                        {ligadores.length > 4 && (
                            <div className="w-10 h-10 rounded-2xl border-2 border-[#030303] bg-gray-900 flex items-center justify-center text-[11px] font-black text-gray-400 z-10">
                                +{ligadores.length - 4}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                <div className="relative col-span-1 md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome, CPF ou celular..."
                        className="w-full pl-12 pr-6 py-4 glass rounded-3xl text-white placeholder-gray-700 text-sm font-medium focus:outline-none focus:ring-4 transition-all border-white/5"
                        style={{ '--tw-ring-color': `rgba(${theme.primaryRGB}, 0.15)` } as any}
                    />
                </div>

                <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" size={16} />
                    <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 glass rounded-3xl text-white text-sm font-bold focus:outline-none appearance-none cursor-pointer border-white/5 hover:bg-white/[0.05] transition-all"
                    >
                        <option value="todos" className="bg-[#0a0a0a]">TODOS STATUS</option>
                        <option value="ativo" className="bg-[#0a0a0a]">WHATSAPP</option>
                        <option value="fixo" className="bg-[#0a0a0a]">FIXO</option>
                        <option value="invalido" className="bg-[#0a0a0a]">INVÁLIDO</option>
                    </select>
                </div>

                <div className="relative group">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" size={16} />
                    <select
                        value={filtroLigador}
                        onChange={(e) => setFiltroLigador(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 glass rounded-3xl text-white text-sm font-bold focus:outline-none appearance-none cursor-pointer border-white/5 hover:bg-white/[0.05] transition-all"
                    >
                        <option value="todos" className="bg-[#0a0a0a]">TODOS LIGADORES</option>
                        <option value="nenhum" className="bg-[#0a0a0a]">NÃO ATRIBUÍDOS</option>
                        {ligadores.map(l => (
                            <option key={l.id} value={l.id} className="bg-[#0a0a0a]">{l.nome.toUpperCase()}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid display */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-600">
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-transparent animate-spin" style={{ borderTopColor: theme.primary }} />
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest opacity-50">Sincronizando Fichas...</p>
                </div>
            ) : leadsFiltrados.length === 0 ? (
                <div className="text-center py-40 glass rounded-[3rem] border border-dashed border-white/10 animate-fade-in group">
                    <div className="relative inline-block mb-6">
                        <Users className="text-gray-800 transition-all duration-700 group-hover:scale-110 group-hover:rotate-12" size={80} />
                        <Star className="absolute -top-2 -right-2 text-violet-600 animate-pulse" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400">Tudo limpo por aqui!</h3>
                    <p className="text-gray-600 font-medium mt-2">Nenhuma ficha pendente de atribuição foi encontrada.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                    {leadsFiltrados.map((c, i) => {
                        const nomeLigador = getNomeLigador(c.atribuido_a)
                        const isAssigning = assigningId === c.id

                        return (
                            <div
                                key={c.id}
                                className="glass rounded-[2.5rem] p-8 card-hover animate-fade-in-up relative group border border-white/5 hover:border-white/10 flex flex-col h-full"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                {/* Background Glow */}
                                <div
                                    className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-0 group-hover:opacity-10 transition-all duration-1000 blur-3xl pointer-events-none"
                                    style={{ backgroundColor: theme.primary }}
                                />

                                {/* Header of card */}
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex items-center gap-5">
                                        <div
                                            className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-700 group-hover:scale-110 group-hover:rotate-3"
                                            style={{
                                                background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.4), rgba(${theme.primaryRGB}, 0.1))`,
                                                color: theme.primary,
                                                border: `1px solid rgba(${theme.primaryRGB}, 0.2)`
                                            }}
                                        >
                                            {c.nome ? c.nome.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white group-hover:text-violet-400 transition-all leading-tight">{c.nome || 'Sem Nome'}</h3>
                                            <div className="flex items-center gap-2.5 mt-2">
                                                <span className="text-[11px] font-mono font-bold text-gray-500 tracking-tighter">{c.cpf}</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                                                <span
                                                    className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                                                    style={{ color: theme.primary, backgroundColor: `rgba(${theme.primaryRGB}, 0.1)` }}
                                                >
                                                    {(c.bancos as any)?.nome || 'OUTROS'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        {statusBadge(c.status_whatsapp, c.telefone)}
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="glass-light rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign size={14} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Renda</span>
                                        </div>
                                        <p className="text-lg font-black text-white tracking-tighter">
                                            {c.renda ? `R$ ${c.renda.toLocaleString()}` : '—'}
                                        </p>
                                    </div>
                                    <div className="glass-light rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Star size={14} className="text-amber-500" />
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Score</span>
                                        </div>
                                        <p className="text-lg font-black text-white tracking-tighter">{c.score || '—'}</p>
                                    </div>
                                    <div className="glass-light rounded-2xl p-4 border border-white/5 md:col-span-1 lg:col-span-2 flex flex-col justify-between relative overflow-hidden group/attr">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ShieldCheck size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ligador Atribuído</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setAssigningId(isAssigning ? null : c.id)
                                            }}
                                            className="text-sm font-black text-left w-full flex items-center justify-between gap-3 p-1 rounded-lg hover:bg-white/5 transition-all group/btn"
                                            style={{ color: nomeLigador ? theme.primary : '#444' }}
                                        >
                                            <span className="truncate uppercase tracking-tight">{nomeLigador || '⚠️ Aguardando Ligador'}</span>
                                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover/btn:bg-white/10 transition-all">
                                                <ChevronDown size={14} className={`transition-transform duration-500 ${isAssigning ? 'rotate-180 scale-125' : ''}`} />
                                            </div>
                                        </button>

                                        {/* Premium Dropdown Selection */}
                                        {isAssigning && (
                                            <div
                                                className="absolute inset-0 z-[100] glass-strong rounded-2xl p-2.5 animate-fade-in shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/20 flex flex-col overflow-y-auto"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center justify-between p-2 mb-2 border-b border-white/5">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase">Selecione o Operador</span>
                                                    <X size={14} className="text-gray-500 hover:text-white cursor-pointer" onClick={() => setAssigningId(null)} />
                                                </div>
                                                <div className="space-y-1">
                                                    {ligadores.map(lig => (
                                                        <button
                                                            key={lig.id}
                                                            onClick={() => handleAtribuir(c.id, lig.id)}
                                                            className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group/item ${c.atribuido_a === lig.id
                                                                ? 'bg-gradient-to-r from-violet-600/20 to-transparent'
                                                                : 'hover:bg-white/5'
                                                                }`}
                                                        >
                                                            <div
                                                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg group-hover/item:scale-110 transition-transform"
                                                                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary + '33'})` }}
                                                            >
                                                                <span className="text-xs font-black text-white">{lig.nome.charAt(0).toUpperCase()}</span>
                                                            </div>
                                                            <div className="flex-1 text-left">
                                                                <p className="text-sm font-black text-white tracking-tight">{lig.nome}</p>
                                                                <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">OPERADOR ATIVO</p>
                                                            </div>
                                                            {c.atribuido_a === lig.id && (
                                                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center animate-bounce">
                                                                    <Check size={12} className="text-white" />
                                                                </div>
                                                            )}
                                                            <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                <UserCheck size={16} style={{ color: theme.primary }} />
                                                            </div>
                                                        </button>
                                                    ))}
                                                    {ligadores.length === 0 && (
                                                        <div className="py-10 text-center">
                                                            <UserCog className="mx-auto text-gray-800 mb-2" size={32} />
                                                            <p className="text-[10px] font-black text-gray-600 uppercase">Nenhum ligador encontrado</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Phone Area */}
                                <div className="space-y-3 mt-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em]">Contactos Disponíveis</span>
                                        <div className="h-[1px] flex-1 bg-white/5 mx-4" />
                                    </div>
                                    {c.telefone ? (
                                        <div className="max-h-[160px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                            {c.telefone.split(',').map((tel: string, idx: number) => {
                                                const telClean = tel.trim()
                                                const isFirstWA = c.status_whatsapp === 'ativo' && idx === 0

                                                return (
                                                    <div key={idx} className="bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-4 flex items-center justify-between border border-white/[0.05] transition-all group/phone overflow-hidden relative">
                                                        {isFirstWA && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-gray-950 flex items-center justify-center shrink-0 border border-white/5">
                                                                <Phone size={16} className="text-gray-500 group-hover/phone:text-white transition-colors" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-gray-700 uppercase mb-0.5 tracking-tighter">Telefone {idx + 1}</p>
                                                                <p className="text-sm font-mono font-black text-gray-400 tracking-wider group-hover/phone:text-white transition-colors">{telClean}</p>
                                                            </div>
                                                        </div>

                                                        {/* Apenas botão se for WA (lógica simplificada para admin) */}
                                                        {idx === 0 && c.status_whatsapp === 'ativo' && (
                                                            <a
                                                                href={`https://wa.me/55${telClean.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-90"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </a>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="bg-white/[0.02] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 border border-dashed border-white/10 opacity-40">
                                            <RefreshCw size={24} className="text-gray-700 animate-spin-slow" />
                                            <p className="text-[10px] font-black text-gray-600 uppercase">Processando telefones...</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer section with delete and date */}
                                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between group-hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5">
                                            <Calendar size={12} className="text-gray-600" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">
                                            Entrada: {new Date(c.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeletar(c.id)
                                        }}
                                        className="w-10 h-10 rounded-xl glass text-gray-700 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all active:scale-90 flex items-center justify-center"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Injetar estilos customizados para a scrollbar fina */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    )
}
