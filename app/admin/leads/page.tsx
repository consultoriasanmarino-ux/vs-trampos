'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Smartphone, Phone, AlertTriangle, Filter } from 'lucide-react'
import { supabase, Cliente, Banco } from '@/lib/supabase'

export default function LeadsPage() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [bancos, setBancos] = useState<Banco[]>([])
    const [filtroWhatsapp, setFiltroWhatsapp] = useState<string>('todos')
    const [filtroBanco, setFiltroBanco] = useState<string>('todos')
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        carregarDados()
    }, [filtroWhatsapp, filtroBanco])

    const carregarDados = async () => {
        setLoading(true)

        // Bancos
        const { data: bancosData } = await supabase.from('bancos').select('*').order('nome')
        if (bancosData) setBancos(bancosData)

        // Clientes com filtros
        let query = supabase.from('clientes').select('*, bancos(nome)').order('created_at', { ascending: false }).limit(100)

        if (filtroWhatsapp !== 'todos') {
            query = query.eq('status_whatsapp', filtroWhatsapp)
        }
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
            c.nome?.toLowerCase().includes(termo) ||
            c.telefone?.includes(termo)
        )
    })

    const statusIcon = (status: string | null) => {
        switch (status) {
            case 'ativo': return <Smartphone size={14} className="text-green-500" />
            case 'fixo': return <Phone size={14} className="text-yellow-500" />
            case 'invalido': return <AlertTriangle size={14} className="text-red-500" />
            default: return <span className="w-3.5 h-3.5 rounded-full bg-gray-800 inline-block" />
        }
    }

    const statusLabel = (status: string | null) => {
        switch (status) {
            case 'ativo': return 'WhatsApp'
            case 'fixo': return 'Fixo'
            case 'invalido': return 'Inválido'
            default: return 'Sem info'
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Leads</h1>
                <p className="text-gray-600 text-sm mt-1">Visualize e filtre seus leads importados.</p>
            </div>

            {/* Filtros */}
            <div className="flex flex-col lg:flex-row gap-3 mb-6">
                {/* Busca */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por CPF, nome ou telefone..."
                        className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                </div>

                {/* Filtro WhatsApp */}
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-600" />
                    <select
                        value={filtroWhatsapp}
                        onChange={(e) => setFiltroWhatsapp(e.target.value)}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
                    >
                        <option value="todos" className="bg-[#111]">Todos Status</option>
                        <option value="ativo" className="bg-[#111]">WhatsApp Ativo</option>
                        <option value="fixo" className="bg-[#111]">Telefone Fixo</option>
                        <option value="invalido" className="bg-[#111]">Inválido</option>
                    </select>
                </div>

                {/* Filtro Banco */}
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

            {/* Contador */}
            <div className="flex items-center gap-2 mb-4">
                <Users size={14} className="text-gray-600" />
                <span className="text-xs text-gray-500 font-medium">{clientesFiltrados.length} lead(s) encontrado(s)</span>
            </div>

            {/* Tabela */}
            <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.04]">
                                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">CPF</th>
                                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Renda</th>
                                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Score</th>
                                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Banco</th>
                                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Telefone</th>
                                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-600 text-sm">Carregando...</td></tr>
                            ) : clientesFiltrados.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-600 text-sm">Nenhum lead encontrado.</td></tr>
                            ) : (
                                clientesFiltrados.map((c) => (
                                    <tr key={c.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5 text-sm text-white font-mono">{c.cpf}</td>
                                        <td className="px-5 py-3.5 text-sm text-gray-300">{c.nome || '—'}</td>
                                        <td className="px-5 py-3.5 text-sm text-gray-300">{c.renda ? `R$ ${c.renda.toLocaleString()}` : '—'}</td>
                                        <td className="px-5 py-3.5 text-sm text-gray-300">{c.score || '—'}</td>
                                        <td className="px-5 py-3.5 text-sm text-gray-300">{(c.bancos as any)?.nome || '—'}</td>
                                        <td className="px-5 py-3.5 text-sm text-gray-300 font-mono">{c.telefone || '—'}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                {statusIcon(c.status_whatsapp)}
                                                <span className="text-xs text-gray-400">{statusLabel(c.status_whatsapp)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
