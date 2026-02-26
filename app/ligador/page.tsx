'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Filter, Smartphone, Phone, AlertTriangle, CreditCard, TrendingUp, Star } from 'lucide-react'
import { supabase, Cliente, Banco } from '@/lib/supabase'

export default function LigadorPage() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [bancos, setBancos] = useState<Banco[]>([])
    const [filtroBanco, setFiltroBanco] = useState<string>('todos')
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        carregarDados()
    }, [filtroBanco])

    const carregarDados = async () => {
        setLoading(true)

        // Bancos
        const { data: bancosData } = await supabase.from('bancos').select('*').order('nome')
        if (bancosData) setBancos(bancosData)

        // Clientes
        let query = supabase
            .from('clientes')
            .select('*, bancos(nome)')
            .order('created_at', { ascending: false })

        if (filtroBanco !== 'todos') {
            query = query.eq('banco_principal_id', filtroBanco)
        }

        const { data } = await query
        if (data) setClientes(data)
        setLoading(false)
    }

    const clientesFiltrados = clientes.filter(c => {
        if (!busca) return true
        const termo = busca.toLowerCase()
        return (
            c.cpf?.toLowerCase().includes(termo) ||
            c.nome?.toLowerCase().includes(termo)
        )
    })

    const statusBadge = (status: string | null) => {
        switch (status) {
            case 'ativo':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 rounded-md text-[10px] font-semibold">
                        <Smartphone size={10} /> WhatsApp
                    </span>
                )
            case 'fixo':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-md text-[10px] font-semibold">
                        <Phone size={10} /> Fixo
                    </span>
                )
            case 'invalido':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md text-[10px] font-semibold">
                        <AlertTriangle size={10} /> Inválido
                    </span>
                )
            default:
                return (
                    <span className="inline-flex px-2 py-0.5 bg-white/[0.03] text-gray-600 rounded-md text-[10px] font-semibold">
                        Sem info
                    </span>
                )
        }
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Fichas de Clientes</h1>
                <p className="text-gray-600 text-sm mt-1">Visualize os leads atribuídos a você.</p>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por CPF ou nome..."
                        className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-600" />
                    <select
                        value={filtroBanco}
                        onChange={(e) => setFiltroBanco(e.target.value)}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
                    >
                        <option value="todos" className="bg-[#111]">Todos Bancos</option>
                        {bancos.map(b => (
                            <option key={b.id} value={b.id} className="bg-[#111]">{b.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Contador */}
            <div className="flex items-center gap-2 mb-4">
                <Users size={14} className="text-gray-600" />
                <span className="text-xs text-gray-500 font-medium">{clientesFiltrados.length} ficha(s)</span>
            </div>

            {/* Cards */}
            {loading ? (
                <div className="text-center py-20 text-gray-600 text-sm">Carregando fichas...</div>
            ) : clientesFiltrados.length === 0 ? (
                <div className="text-center py-20">
                    <Users className="mx-auto text-gray-800 mb-3" size={48} />
                    <p className="text-gray-600 text-sm">Nenhuma ficha encontrada.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {clientesFiltrados.map((c) => (
                        <div
                            key={c.id}
                            className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-5 hover:border-white/[0.08] transition-all group"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-white/[0.04]">
                                        <span className="text-sm font-bold text-blue-400">
                                            {c.nome ? c.nome.charAt(0).toUpperCase() : '#'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{c.nome || 'Sem nome'}</p>
                                        <p className="text-[10px] text-gray-600 font-mono">{c.cpf}</p>
                                    </div>
                                </div>
                                {statusBadge(c.status_whatsapp)}
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-white/[0.02] rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <TrendingUp size={10} className="text-green-500" />
                                        <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Renda</p>
                                    </div>
                                    <p className="text-sm font-semibold text-white">
                                        {c.renda ? `R$ ${c.renda.toLocaleString()}` : '—'}
                                    </p>
                                </div>
                                <div className="bg-white/[0.02] rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Star size={10} className="text-yellow-500" />
                                        <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Score</p>
                                    </div>
                                    <p className="text-sm font-semibold text-white">{c.score || '—'}</p>
                                </div>
                            </div>

                            {/* Banco & Tel */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CreditCard size={12} className="text-gray-600" />
                                    <span className="text-xs text-gray-400">{(c.bancos as any)?.nome || 'Sem banco'}</span>
                                </div>
                                {c.telefone && (
                                    <div className="flex items-center gap-2">
                                        <Phone size={12} className="text-gray-600" />
                                        <span className="text-xs text-gray-400 font-mono">{c.telefone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
