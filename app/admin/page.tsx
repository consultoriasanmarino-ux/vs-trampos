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
    TrendingUp,
    ArrowUpRight,
} from 'lucide-react'
import { supabase, Banco } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function AdminDashboard() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()

    const [bancos, setBancos] = useState<Banco[]>([])
    const [fileCpf, setFileCpf] = useState<File | null>(null)
    const [fileEnriquecer, setFileEnriquecer] = useState<File | null>(null)
    const [loadingCpf, setLoadingCpf] = useState(false)
    const [loadingEnriquecer, setLoadingEnriquecer] = useState(false)
    const [statusCpf, setStatusCpf] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [statusEnriquecer, setStatusEnriquecer] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const [totalClientes, setTotalClientes] = useState(0)
    const [totalWhatsapp, setTotalWhatsapp] = useState(0)
    const [totalFixo, setTotalFixo] = useState(0)
    const [totalPendentes, setTotalPendentes] = useState(0)
    const [totalBancos, setTotalBancos] = useState(0)

    useEffect(() => {
        carregarBancos()
        carregarStats()

        // Inscrever no Realtime para atualizar stats quando leads mudarem (validação Baileys)
        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
                carregarStats()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedBankId])

    const carregarBancos = async () => {
        const { data } = await supabase.from('bancos').select('*').order('nome')
        if (data) {
            setBancos(data)
            setTotalBancos(data.length)
        }
    }

    const carregarStats = async () => {
        let queryTotal = supabase.from('clientes').select('*', { count: 'exact', head: true })
        let queryWa = supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('status_whatsapp', 'ativo')
        let queryFixo = supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('status_whatsapp', 'fixo')
        let queryPend = supabase.from('clientes').select('*', { count: 'exact', head: true }).is('status_whatsapp', null).not('telefone', 'is', null)

        if (selectedBankId) {
            queryTotal = queryTotal.eq('banco_principal_id', selectedBankId)
            queryWa = queryWa.eq('banco_principal_id', selectedBankId)
            queryFixo = queryFixo.eq('banco_principal_id', selectedBankId)
            queryPend = queryPend.eq('banco_principal_id', selectedBankId)
        }

        const { count: total } = await queryTotal
        const { count: whatsapp } = await queryWa
        const { count: fixo } = await queryFixo
        const { count: pendentes } = await queryPend

        setTotalClientes(total || 0)
        setTotalWhatsapp(whatsapp || 0)
        setTotalFixo(fixo || 0)
        setTotalPendentes(pendentes || 0)
    }

    const handleUploadCpf = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fileCpf || !selectedBankId) return

        setLoadingCpf(true)
        setStatusCpf(null)

        const formData = new FormData()
        formData.append('file', fileCpf)
        formData.append('banco_id', selectedBankId)

        try {
            const res = await fetch('/api/import', { method: 'POST', body: formData })
            const data = await res.json()

            if (res.ok) {
                setStatusCpf({ type: 'success', message: data.message })
                setFileCpf(null)
            } else {
                setStatusCpf({ type: 'error', message: data.error })
            }
        } catch {
            setStatusCpf({ type: 'error', message: 'Erro de conexão.' })
        } finally {
            setLoadingCpf(false)
        }
    }

    const handleUploadEnriquecer = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fileEnriquecer) return

        setLoadingEnriquecer(true)
        setStatusEnriquecer(null)

        const formData = new FormData()
        formData.append('file', fileEnriquecer)
        if (selectedBankId) formData.append('banco_id', selectedBankId)

        try {
            const res = await fetch('/api/enriquecer', { method: 'POST', body: formData })
            const data = await res.json()

            if (res.ok) {
                setStatusEnriquecer({ type: 'success', message: data.message })
                setFileEnriquecer(null)
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
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        Dashboard
                        {selectedBankName && (
                            <span
                                className="text-sm font-semibold px-3 py-1 rounded-lg"
                                style={{
                                    background: `rgba(${theme.primaryRGB}, 0.1)`,
                                    color: theme.primary,
                                }}
                            >
                                {selectedBankName}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-600 text-sm mt-1">
                        {selectedBankName ? `Gerenciando leads do ${selectedBankName}` : 'Selecione um banco para começar'}
                    </p>
                </div>
                <button
                    onClick={() => { carregarBancos(); carregarStats() }}
                    className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-gray-400 hover:text-white transition-all text-sm group"
                >
                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    Atualizar
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                    icon={<Users size={20} />}
                    label="Total Leads"
                    value={totalClientes}
                    theme={theme}
                    delay="stagger-1"
                />
                <StatCard
                    icon={<Smartphone size={20} />}
                    label="WhatsApp"
                    value={totalWhatsapp}
                    theme={theme}
                    delay="stagger-2"
                    accent="green"
                />
                <StatCard
                    icon={<Phone size={20} />}
                    label="Fixo / Outros"
                    value={totalFixo}
                    theme={theme}
                    delay="stagger-3"
                    accent="yellow"
                />
                <StatCard
                    icon={<RefreshCw size={20} />}
                    label="Analisando"
                    value={totalPendentes}
                    theme={theme}
                    delay="stagger-4"
                    accent="purple"
                />
                <StatCard
                    icon={<Database size={20} />}
                    label="Bancos"
                    value={totalBancos}
                    theme={theme}
                    delay="stagger-5"
                    accent="blue"
                />
            </div>

            {/* Upload Modules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Import CPF */}
                <div className={`glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-2`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div
                            className="p-2.5 rounded-xl transition-all duration-500"
                            style={{ background: `rgba(${theme.primaryRGB}, 0.1)` }}
                        >
                            <Upload size={20} style={{ color: theme.primary }} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Importar CPFs</h2>
                            <p className="text-xs text-gray-600">
                                Vinculado ao <span style={{ color: theme.primary }} className="font-semibold">{selectedBankName || '...'}</span>
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleUploadCpf} className="space-y-4">
                        {/* Upload area */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Arquivo TXT</label>
                            <div
                                className="border border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer relative group"
                                style={{ borderColor: `rgba(${theme.primaryRGB}, 0.15)` }}
                            >
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={(e) => setFileCpf(e.target.files?.[0] || null)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <FileText
                                    className="mx-auto mb-3 transition-all duration-300 group-hover:scale-110"
                                    size={36}
                                    style={{ color: fileCpf ? theme.primary : 'rgb(50,50,50)' }}
                                />
                                <p className="text-xs text-gray-500">
                                    {fileCpf ? (
                                        <span style={{ color: theme.primary }} className="font-semibold">{fileCpf.name}</span>
                                    ) : (
                                        'Clique ou arraste o arquivo .txt'
                                    )}
                                </p>
                                <p className="text-[10px] text-gray-700 mt-1">Um CPF por linha</p>
                            </div>
                        </div>

                        {statusCpf && <StatusAlert type={statusCpf.type} message={statusCpf.message} theme={theme} />}

                        <button
                            type="submit"
                            disabled={loadingCpf || !fileCpf || !selectedBankId}
                            className="w-full text-white font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm relative overflow-hidden"
                            style={{
                                background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}cc)`,
                                boxShadow: `0 4px 20px rgba(${theme.primaryRGB}, 0.3)`,
                            }}
                        >
                            <div className="absolute inset-0 animate-shimmer" />
                            <span className="relative">{loadingCpf ? 'Processando...' : 'Importar CPFs'}</span>
                        </button>
                    </form>
                </div>

                {/* Enriquecer Leads */}
                <div className="glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-3">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10">
                            <TrendingUp size={20} className="text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Enriquecer Leads</h2>
                            <p className="text-xs text-gray-600">TXT (Leads_completos), CSV ou JSON</p>
                        </div>
                    </div>

                    <form onSubmit={handleUploadEnriquecer} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Arquivo CSV ou JSON</label>
                            <div className="border border-dashed border-emerald-500/15 rounded-2xl p-8 text-center transition-all cursor-pointer relative group hover:border-emerald-500/30">
                                <input
                                    type="file"
                                    accept=".csv,.json,.txt"
                                    onChange={(e) => setFileEnriquecer(e.target.files?.[0] || null)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <Database
                                    className="mx-auto mb-3 transition-all duration-300 group-hover:scale-110"
                                    size={36}
                                    style={{ color: fileEnriquecer ? '#10b981' : 'rgb(50,50,50)' }}
                                />
                                <p className="text-xs text-gray-500">
                                    {fileEnriquecer ? (
                                        <span className="text-emerald-400 font-semibold">{fileEnriquecer.name}</span>
                                    ) : (
                                        'Clique ou arraste o archivo'
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="glass rounded-xl p-3">
                            <p className="text-[9px] text-gray-600 uppercase tracking-wider font-bold mb-2">Formatos Aceitos</p>
                            <div className="flex flex-wrap gap-1.5">
                                {['Leads_completos.txt', '.csv', '.json'].map(col => (
                                    <span key={col} className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-md text-[10px] text-gray-400 font-mono">{col}</span>
                                ))}
                            </div>
                            <p className="text-[9px] text-gray-700 mt-2">Campos: NOME, CPF, NASC, RENDA, SCORE, CELULARES</p>
                        </div>

                        {statusEnriquecer && <StatusAlert type={statusEnriquecer.type} message={statusEnriquecer.message} theme={theme} />}

                        <button
                            type="submit"
                            disabled={loadingEnriquecer || !fileEnriquecer}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                        >
                            {loadingEnriquecer ? 'Processando...' : 'Enriquecer Leads'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, theme, delay, accent }: {
    icon: React.ReactNode; label: string; value: number; theme: any; delay: string; accent?: string
}) {
    const colors: Record<string, { bg: string; text: string }> = {
        green: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
        yellow: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
        purple: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7' },
        blue: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
    }

    const c = accent ? colors[accent] : { bg: `rgba(${theme.primaryRGB}, 0.1)`, text: theme.primary }

    return (
        <div className={`glass rounded-2xl p-5 card-hover animate-fade-in-up ${delay} relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg transition-all duration-500" style={{ background: c.bg }}>
                    <div style={{ color: c.text }}>{icon}</div>
                </div>
                <ArrowUpRight size={14} className="text-gray-700" />
            </div>
            <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600 mt-0.5 font-semibold uppercase tracking-wider">{label}</p>

            {/* Decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-30" style={{ background: `linear-gradient(to right, transparent, ${c.text}, transparent)` }} />
        </div>
    )
}

function StatusAlert({ type, message, theme }: { type: 'success' | 'error'; message: string; theme: any }) {
    return (
        <div className={`p-3 rounded-xl flex items-center gap-2.5 animate-fade-in-up ${type === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
            {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <p className="text-xs font-medium">{message}</p>
        </div>
    )
}
