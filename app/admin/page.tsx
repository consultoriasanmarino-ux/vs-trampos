'use client'

import { useState, useEffect } from 'react'
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Database,
    Users,
    Smartphone,
    Phone,
    RefreshCw,
} from 'lucide-react'
import { supabase, Banco } from '@/lib/supabase'

export default function AdminDashboard() {
    // State
    const [bancos, setBancos] = useState<Banco[]>([])
    const [bancoSelecionado, setBancoSelecionado] = useState('')
    const [fileCpf, setFileCpf] = useState<File | null>(null)
    const [fileEnriquecer, setFileEnriquecer] = useState<File | null>(null)
    const [loadingCpf, setLoadingCpf] = useState(false)
    const [loadingEnriquecer, setLoadingEnriquecer] = useState(false)
    const [statusCpf, setStatusCpf] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [statusEnriquecer, setStatusEnriquecer] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    // Stats
    const [totalClientes, setTotalClientes] = useState(0)
    const [totalWhatsapp, setTotalWhatsapp] = useState(0)
    const [totalFixo, setTotalFixo] = useState(0)
    const [totalBancos, setTotalBancos] = useState(0)

    // Carregar dados iniciais
    useEffect(() => {
        carregarBancos()
        carregarStats()
    }, [])

    const carregarBancos = async () => {
        const { data } = await supabase.from('bancos').select('*').order('nome')
        if (data) {
            setBancos(data)
            setTotalBancos(data.length)
        }
    }

    const carregarStats = async () => {
        const { count: total } = await supabase.from('clientes').select('*', { count: 'exact', head: true })
        const { count: whatsapp } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('status_whatsapp', 'ativo')
        const { count: fixo } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('status_whatsapp', 'fixo')

        setTotalClientes(total || 0)
        setTotalWhatsapp(whatsapp || 0)
        setTotalFixo(fixo || 0)
    }

    // Upload de CPFs
    const handleUploadCpf = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fileCpf || !bancoSelecionado) return

        setLoadingCpf(true)
        setStatusCpf(null)

        const formData = new FormData()
        formData.append('file', fileCpf)
        formData.append('banco_id', bancoSelecionado)

        try {
            const res = await fetch('/api/import', { method: 'POST', body: formData })
            const data = await res.json()

            if (res.ok) {
                setStatusCpf({ type: 'success', message: data.message })
                setFileCpf(null)
                setBancoSelecionado('')
                carregarStats()
            } else {
                setStatusCpf({ type: 'error', message: data.error })
            }
        } catch {
            setStatusCpf({ type: 'error', message: 'Erro de conexão.' })
        } finally {
            setLoadingCpf(false)
        }
    }

    // Upload de Enriquecimento
    const handleUploadEnriquecer = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fileEnriquecer) return

        setLoadingEnriquecer(true)
        setStatusEnriquecer(null)

        const formData = new FormData()
        formData.append('file', fileEnriquecer)

        try {
            const res = await fetch('/api/enriquecer', { method: 'POST', body: formData })
            const data = await res.json()

            if (res.ok) {
                setStatusEnriquecer({ type: 'success', message: data.message })
                setFileEnriquecer(null)
                carregarStats()
            } else {
                setStatusEnriquecer({ type: 'error', message: data.error })
            }
        } catch {
            setStatusEnriquecer({ type: 'error', message: 'Erro de conexão.' })
        } finally {
            setLoadingEnriquecer(false)
        }
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
                    <p className="text-gray-600 text-sm mt-1">Gerencie leads, bancos e importações.</p>
                </div>
                <button
                    onClick={() => { carregarBancos(); carregarStats() }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all text-sm"
                >
                    <RefreshCw size={14} />
                    Atualizar
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <StatCard icon={<Users size={20} />} label="Total Clientes" value={totalClientes} color="blue" />
                <StatCard icon={<Smartphone size={20} />} label="WhatsApp Ativo" value={totalWhatsapp} color="green" />
                <StatCard icon={<Phone size={20} />} label="Telefone Fixo" value={totalFixo} color="yellow" />
                <StatCard icon={<Database size={20} />} label="Bancos" value={totalBancos} color="purple" />
            </div>

            {/* Upload Modules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Import CPF */}
                <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl">
                            <Upload className="text-blue-500" size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Importar CPFs</h2>
                            <p className="text-xs text-gray-600">Arquivo .txt com um CPF por linha</p>
                        </div>
                    </div>

                    <form onSubmit={handleUploadCpf} className="space-y-4">
                        {/* Seleção do Banco */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Banco</label>
                            <select
                                value={bancoSelecionado}
                                onChange={(e) => setBancoSelecionado(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
                                required
                            >
                                <option value="" className="bg-[#111]">Selecione um banco...</option>
                                {bancos.map((b) => (
                                    <option key={b.id} value={b.id} className="bg-[#111]">{b.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Upload */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Arquivo</label>
                            <div className="border border-dashed border-white/[0.08] rounded-xl p-6 text-center hover:border-blue-500/30 transition-colors cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={(e) => setFileCpf(e.target.files?.[0] || null)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    required
                                />
                                <FileText className="mx-auto text-gray-700 group-hover:text-blue-500 mb-2 transition-colors" size={32} />
                                <p className="text-xs text-gray-500">
                                    {fileCpf ? <span className="text-blue-400 font-medium">{fileCpf.name}</span> : 'Clique ou arraste o .txt'}
                                </p>
                            </div>
                        </div>

                        {statusCpf && <StatusAlert type={statusCpf.type} message={statusCpf.message} />}

                        <button
                            type="submit"
                            disabled={loadingCpf || !fileCpf || !bancoSelecionado}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                        >
                            {loadingCpf ? 'Processando...' : 'Importar CPFs'}
                        </button>
                    </form>
                </div>

                {/* Enriquecer Leads */}
                <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-green-500/10 rounded-xl">
                            <Database className="text-green-500" size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Enriquecer Leads</h2>
                            <p className="text-xs text-gray-600">CSV/JSON com Nome, Renda, Score, Telefone</p>
                        </div>
                    </div>

                    <form onSubmit={handleUploadEnriquecer} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Arquivo CSV ou JSON</label>
                            <div className="border border-dashed border-white/[0.08] rounded-xl p-6 text-center hover:border-green-500/30 transition-colors cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".csv,.json,.txt"
                                    onChange={(e) => setFileEnriquecer(e.target.files?.[0] || null)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    required
                                />
                                <FileText className="mx-auto text-gray-700 group-hover:text-green-500 mb-2 transition-colors" size={32} />
                                <p className="text-xs text-gray-500">
                                    {fileEnriquecer ? <span className="text-green-400 font-medium">{fileEnriquecer.name}</span> : 'Clique ou arraste o archivo'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Colunas Esperadas</p>
                            <div className="flex flex-wrap gap-1.5">
                                {['cpf', 'nome', 'renda', 'score', 'telefone'].map(col => (
                                    <span key={col} className="px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded-md text-[10px] text-gray-400 font-mono">{col}</span>
                                ))}
                            </div>
                        </div>

                        {statusEnriquecer && <StatusAlert type={statusEnriquecer.type} message={statusEnriquecer.message} />}

                        <button
                            type="submit"
                            disabled={loadingEnriquecer || !fileEnriquecer}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-green-600/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                        >
                            {loadingEnriquecer ? 'Processando...' : 'Enriquecer Leads'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-500/10 text-blue-500',
        green: 'bg-green-500/10 text-green-500',
        yellow: 'bg-yellow-500/10 text-yellow-500',
        purple: 'bg-purple-500/10 text-purple-500',
    }

    return (
        <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
            </div>
            <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1 font-medium uppercase tracking-wider">{label}</p>
        </div>
    )
}

function StatusAlert({ type, message }: { type: 'success' | 'error'; message: string }) {
    return (
        <div className={`p-3 rounded-xl flex items-center gap-2.5 text-sm ${type === 'success'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
            {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <p className="text-xs font-medium">{message}</p>
        </div>
    )
}
