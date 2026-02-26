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
    Zap,
    Cpu,
    Globe,
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
    const [enriching, setEnriching] = useState(false)
    const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 })

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

    const handleAutoConsultar = async () => {
        // Busca todos os leads sem nome (apenas CPF)
        let query = supabase.from('clientes').select('*').or('nome.is.null,nome.eq.""')
        if (selectedBankId) query = query.eq('banco_principal_id', selectedBankId)

        const { data: leadsParaEnriquecer } = await query

        if (!leadsParaEnriquecer || leadsParaEnriquecer.length === 0) {
            alert('Não há fichas pendentes de consulta (todas já possuem nome).')
            return
        }

        if (!confirm(`Deseja consultar os dados de ${leadsParaEnriquecer.length} ficha(s) automaticamente?`)) return

        setEnriching(true)
        setEnrichProgress({ current: 0, total: leadsParaEnriquecer.length })

        let apiUrl = localStorage.getItem('api_consulta_url') || 'https://completa.workbuscas.com/api?token=TOKEN&modulo=MODULO&consulta=DOCUMENTO'
        let apiToken = localStorage.getItem('api_consulta_token') || 'doavTXJphHLkpayfbdNdJyGp'

        try {
            const { data: dbConfigs } = await supabase.from('configuracoes').select('*')
            if (dbConfigs) {
                const urlObj = dbConfigs.find(c => c.key === 'api_consulta_url')
                const tokenObj = dbConfigs.find(c => c.key === 'api_consulta_token')
                if (urlObj) apiUrl = urlObj.value
                if (tokenObj) apiToken = tokenObj.value
            }
        } catch (e) {
            console.warn('Erro ao ler configs do banco')
        }

        let sucessos = 0
        for (const lead of leadsParaEnriquecer) {
            try {
                const url = apiUrl
                    .replace('TOKEN', apiToken)
                    .replace('MODULO', 'completa')
                    .replace('DOCUMENTO', lead.cpf.replace(/\D/g, ''))

                const response = await fetch(url)
                const result = await response.json()

                if (result) {
                    const dados = result.dados || result
                    const novosDados = {
                        nome: dados.nome || dados.NOME || lead.nome,
                        data_nascimento: dados.data_nascimento || dados.NASC || lead.data_nascimento,
                        renda: dados.renda || dados.RENDA || lead.renda,
                        score: dados.score || dados.SCORE || lead.score
                    }

                    await supabase.from('clientes').update(novosDados).eq('id', lead.id)
                    sucessos++
                }
            } catch (err) {
                console.error(`Erro CPF ${lead.cpf}:`, err)
            }
            setEnrichProgress(prev => ({ ...prev, current: prev.current + 1 }))
            await new Promise(r => setTimeout(r, 300))
        }

        setEnriching(false)
        carregarStats()
        alert(`Consulta finalizada! ${sucessos} fichas atualizadas com sucesso.`)
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

                {/* Auto Consult Section */}
                <div className={`glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-3 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Cpu size={100} />
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div
                            className="p-2.5 rounded-xl transition-all duration-500"
                            style={{ background: `rgba(${theme.primaryRGB}, 0.1)` }}
                        >
                            <Zap size={20} style={{ color: theme.primary }} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white uppercase tracking-tight italic">Consultar Automático</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                Enriquecer leads importados (Apenas CPFs)
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
                            <Database className="mx-auto mb-4 text-gray-700" size={48} />
                            <p className="text-sm text-gray-400 mb-2">
                                Identificamos automaticamente os leads que possuem apenas o CPF e buscamos os dados na API configurada.
                            </p>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">
                                Nome • Idade • Renda • Score
                            </p>
                        </div>

                        {enriching && (
                            <div className="space-y-3 px-1">
                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-gray-500">Progresso da Consulta</span>
                                    <span style={{ color: theme.primary }}>{enrichProgress.current} / {enrichProgress.total}</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full transition-all duration-500 animate-pulse"
                                        style={{
                                            width: `${(enrichProgress.current / enrichProgress.total) * 100}%`,
                                            background: `linear-gradient(to right, ${theme.primary}, ${theme.primary}88)`
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleAutoConsultar}
                            disabled={enriching || totalClientes === 0}
                            className="w-full flex items-center justify-center gap-3 font-black uppercase tracking-[0.15em] text-xs py-5 rounded-[1.2rem] shadow-2xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"
                            style={{
                                background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}88)`,
                                color: 'white',
                                boxShadow: `0 10px 40px rgba(${theme.primaryRGB}, 0.2)`
                            }}
                        >
                            {enriching ? (
                                <>
                                    <RefreshCw className="animate-spin" size={18} />
                                    <span>Consultando...</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={18} className="group-hover:scale-125 transition-transform" />
                                    <span>Iniciar Consulta Automática</span>
                                </>
                            )}

                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                        </button>
                    </div>
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
