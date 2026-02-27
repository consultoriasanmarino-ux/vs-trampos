'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Database,
    Users,
    Search,
    Smartphone,
    Phone,
    AlertTriangle,
    Zap,
    Cpu,
    Key,
    KeyRound,
    MessageSquare,
    XCircle,
    Trash2,
    RefreshCw,
    CreditCard,
    ArrowUpRight
} from 'lucide-react'
import { supabase, Banco } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function AdminDashboard() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()

    const [bancos, setBancos] = useState<Banco[]>([])
    const [fileCpf, setFileCpf] = useState<File | null>(null)
    const [fileExtracao, setFileExtracao] = useState<File | null>(null)
    const [loadingCpf, setLoadingCpf] = useState(false)
    const [loadingExtracao, setLoadingExtracao] = useState(false)
    const [statusCpf, setStatusCpf] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [statusExtracao, setStatusExtracao] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const [totalClientes, setTotalClientes] = useState(0)
    const [totalWhatsapp, setTotalWhatsapp] = useState(0)
    const [totalFixo, setTotalFixo] = useState(0)
    const [totalPendentes, setTotalPendentes] = useState(0)
    const [totalIncompletos, setTotalIncompletos] = useState(0)
    const [totalCompletos, setTotalCompletos] = useState(0)
    const [totalWppPendente, setTotalWppPendente] = useState(0)
    const [totalBancos, setTotalBancos] = useState(0)

    const [enriching, setEnriching] = useState(false)
    const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 })
    const shouldStopEnrich = useRef(false)
    const [logs, setLogs] = useState<string[]>([])
    const terminalRef = useRef<HTMLDivElement>(null)

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString('pt-BR', { hour12: false })
        setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 100))
    }

    useEffect(() => {
        carregarBancos()
        carregarStats()

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

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = 0
        }
    }, [logs])

    const carregarBancos = async () => {
        const { data } = await supabase.from('bancos').select('*').order('nome')
        if (data) {
            setBancos(data)
            setTotalBancos(data.length)
        }
    }

    const carregarStats = async () => {
        let queryTotal = supabase.from('clientes').select('*', { count: 'exact', head: true })
        let queryIncompletos = supabase.from('clientes').select('*', { count: 'exact', head: true }).or('nome.is.null,nome.eq.,telefone.is.null,telefone.eq.')
        let queryPendWpp = supabase.from('clientes').select('*', { count: 'exact', head: true }).not('telefone', 'eq', '').not('telefone', 'is', null).eq('wpp_checked', false)
        let queryWa = supabase.from('clientes').select('*', { count: 'exact', head: true }).ilike('telefone', '%✅%')
        let queryFixo = supabase.from('clientes').select('*', { count: 'exact', head: true }).or('telefone.ilike.%☎️%,telefone.ilike.%📞%')
        let queryPend = supabase.from('clientes').select('*', { count: 'exact', head: true }).not('telefone', 'ilike', '%✅%').not('telefone', 'ilike', '%☎️%').not('telefone', 'ilike', '%📞%').not('telefone', 'is', null)

        if (selectedBankId) {
            queryTotal = queryTotal.eq('banco_principal_id', selectedBankId)
            queryIncompletos = queryIncompletos.eq('banco_principal_id', selectedBankId)
            queryPendWpp = queryPendWpp.eq('banco_principal_id', selectedBankId)
            queryWa = queryWa.eq('banco_principal_id', selectedBankId)
            queryFixo = queryFixo.eq('banco_principal_id', selectedBankId)
            queryPend = queryPend.eq('banco_principal_id', selectedBankId)
        }

        const { count: total } = await queryTotal
        const { count: incompletos } = await queryIncompletos
        const { count: pendWpp } = await queryPendWpp
        const { count: whatsapp } = await queryWa
        const { count: fixo } = await queryFixo
        const { count: pendentes } = await queryPend

        setTotalClientes(total || 0)
        setTotalIncompletos(incompletos || 0)
        setTotalCompletos((total || 0) - (incompletos || 0))
        setTotalWppPendente(pendWpp || 0)
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

    const handleUploadExtracao = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fileExtracao || !selectedBankId) return

        setLoadingExtracao(true)
        setStatusExtracao(null)

        const formData = new FormData()
        formData.append('file', fileExtracao)
        formData.append('banco_id', selectedBankId)

        try {
            const res = await fetch('/api/import-extracao', { method: 'POST', body: formData })
            const data = await res.json()
            if (res.ok) {
                setStatusExtracao({ type: 'success', message: data.message })
                setFileExtracao(null)
                carregarStats()
            } else {
                setStatusExtracao({ type: 'error', message: data.error })
            }
        } catch {
            setStatusExtracao({ type: 'error', message: 'Erro de conexão.' })
        } finally {
            setLoadingExtracao(false)
        }
    }

    const handleAutoConsultar = async () => {
        try {
            if (!selectedBankId) {
                alert('Selecione um banco primeiro.')
                return
            }

            addLog('🚀 Iniciando consulta automática (Enriquecimento)...')
            shouldStopEnrich.current = false
            setLogs([])

            let query = supabase.from('clientes')
                .select('id, cpf, nome, telefone')
                .or('nome.is.null,nome.eq.,telefone.is.null,telefone.eq.')
                .limit(2000)

            if (selectedBankId) query = query.eq('banco_principal_id', selectedBankId)

            const { data: leadsParaEnriquecer, error: queryError } = await query

            if (queryError) {
                alert('Erro ao buscar leads: ' + queryError.message)
                return
            }

            if (!leadsParaEnriquecer || leadsParaEnriquecer.length === 0) {
                alert('Não há fichas pendentes de enriquecimento.')
                return
            }

            if (!confirm(`Deseja enriquecer ${leadsParaEnriquecer.length} registro(s) agora?`)) return

            setEnriching(true)
            setEnrichProgress({ current: 0, total: leadsParaEnriquecer.length })

            const batchSize = 5
            for (let i = 0; i < leadsParaEnriquecer.length; i += batchSize) {
                if (shouldStopEnrich.current) {
                    addLog('🛑 Interrompido pelo usuário.')
                    break
                }
                const batch = leadsParaEnriquecer.slice(i, i + batchSize)
                await fetch('/api/consulta-cpf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpfs: batch, enrichOnly: true })
                })
                setEnrichProgress(prev => ({ ...prev, current: Math.min(prev.total, i + batchSize) }))
                addLog(`✨ Processado lote ${Math.floor(i / batchSize) + 1}`)
            }

            setEnriching(false)
            carregarStats()
            alert('Enriquecimento finalizado!')
        } catch (error) {
            setEnriching(false)
        }
    }

    const handleCheckWhatsapp = async () => {
        try {
            if (!selectedBankId) {
                alert('Selecione um banco primeiro.')
                return
            }

            addLog('📱 Iniciando Verificação de WhatsApp...')
            shouldStopEnrich.current = false
            setLogs([])

            let query = supabase.from('clientes')
                .select('id, cpf, nome, telefone')
                .eq('wpp_checked', false)
                .not('telefone', 'is', null)
                .neq('telefone', '')
                .limit(2000)

            if (selectedBankId) query = query.eq('banco_principal_id', selectedBankId)

            const { data: leadsParaCheck, error: queryError } = await query
            if (queryError || !leadsParaCheck || leadsParaCheck.length === 0) {
                alert('Nenhum lead pendente de WhatsApp.')
                return
            }

            if (!confirm(`Iniciar verificação de WhatsApp em ${leadsParaCheck.length} leads?`)) return

            setEnriching(true)
            setEnrichProgress({ current: 0, total: leadsParaCheck.length })

            const batchSize = 10
            for (let i = 0; i < leadsParaCheck.length; i += batchSize) {
                if (shouldStopEnrich.current) break
                const batch = leadsParaCheck.slice(i, i + batchSize)
                await fetch('/api/consulta-cpf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leads: batch, whatsappOnly: true })
                })
                setEnrichProgress(prev => ({ ...prev, current: Math.min(prev.total, i + batchSize) }))
                addLog(`📱 Lote verificado (${i + batch.length}/${leadsParaCheck.length})`)
            }

            setEnriching(false)
            carregarStats()
            alert('Verificação concluída!')
        } catch {
            setEnriching(false)
        }
    }

    const handleLimparCadastros = async () => {
        if (!selectedBankId) {
            alert('Selecione um banco primeiro.')
            return
        }

        const confirmacao = confirm('ATENÇÃO: Isso excluirá PERMANENTEMENTE todos os leads deste banco que não possuem WhatsApp (ícone ✅). Deseja continuar?')
        if (!confirmacao) return

        setEnriching(true)
        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('banco_principal_id', selectedBankId)
                .not('telefone', 'ilike', '%✅%')

            if (error) throw error

            alert(`Limpeza concluída! Leads sem WhatsApp removidos com sucesso.`)
            carregarStats()
        } catch (err: any) {
            console.error('Erro ao limpar:', err)
            alert('Erro ao limpar cadastros: ' + err.message)
        } finally {
            setEnriching(false)
        }
    }

    return (
        <div className="p-6 lg:p-8 text-white">
            <div className="flex items-center justify-between mb-8 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 font-black uppercase italic">
                        Dashboard
                        {selectedBankName && (
                            <span className="text-sm font-semibold px-3 py-1 rounded-lg" style={{ background: `rgba(${theme.primaryRGB}, 0.1)`, color: theme.primary }}>
                                {selectedBankName}
                            </span>
                        )}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    {selectedBankId && (
                        <button
                            onClick={handleLimparCadastros}
                            disabled={enriching}
                            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-500 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            Limpar Cadastros
                        </button>
                    )}
                    <button
                        onClick={() => { carregarBancos(); carregarStats() }}
                        className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-gray-400 hover:text-white transition-all text-sm group"
                    >
                        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                        Atualizar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard icon={<Users size={20} />} label="Total Leads" value={totalClientes} theme={theme} delay="stagger-1" />
                <StatCard icon={<CheckCircle2 size={20} />} label="Fichas Prontas" value={totalCompletos} theme={theme} delay="stagger-2" accent="green" />
                <StatCard icon={<AlertCircle size={20} />} label="Aguardando CPF" value={totalIncompletos} theme={theme} delay="stagger-3" accent="yellow" />
                <StatCard icon={<Smartphone size={20} />} label="Aguardando WPP" value={totalWppPendente} theme={theme} delay="stagger-4" accent="purple" />
                <StatCard icon={<CheckCircle2 size={20} />} label="WhatsApp ✅" value={totalWhatsapp} theme={theme} delay="stagger-5" accent="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass rounded-2xl p-6 card-hover">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl" style={{ background: `rgba(${theme.primaryRGB}, 0.1)` }}>
                            <Upload size={20} style={{ color: theme.primary }} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Importar CPFs</h2>
                        </div>
                    </div>
                    <form onSubmit={handleUploadCpf} className="space-y-4">
                        <div className="border border-dashed rounded-2xl p-8 text-center cursor-pointer relative" style={{ borderColor: `rgba(${theme.primaryRGB}, 0.15)` }}>
                            <input type="file" accept=".txt" onChange={(e) => setFileCpf(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <FileText className="mx-auto mb-3" size={36} style={{ color: fileCpf ? theme.primary : 'rgb(50,50,50)' }} />
                            <p className="text-xs text-gray-500">{fileCpf ? fileCpf.name : 'Clique ou arraste o arquivo .txt'}</p>
                        </div>
                        {statusCpf && <StatusAlert type={statusCpf.type} message={statusCpf.message} theme={theme} />}
                        <button type="submit" disabled={loadingCpf || !fileCpf} className="w-full font-semibold py-3.5 rounded-xl text-sm" style={{ background: theme.primary, color: 'white' }}>
                            {loadingCpf ? 'Processando...' : 'Importar CPFs'}
                        </button>
                    </form>
                </div>

                <div className="glass rounded-2xl p-6 card-hover">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
                            <CreditCard size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Importar Extração</h2>
                        </div>
                    </div>
                    <form onSubmit={handleUploadExtracao} className="space-y-4">
                        <div className="border border-dashed rounded-2xl p-8 text-center cursor-pointer relative" style={{ borderColor: 'rgba(168, 85, 247, 0.15)' }}>
                            <input type="file" accept=".txt" onChange={(e) => setFileExtracao(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <CreditCard className="mx-auto mb-3" size={36} style={{ color: fileExtracao ? '#a855f7' : 'rgb(50,50,50)' }} />
                            <p className="text-xs text-gray-500">{fileExtracao ? fileExtracao.name : 'Clique ou arraste o arquivo .txt'}</p>
                        </div>
                        {statusExtracao && <StatusAlert type={statusExtracao.type} message={statusExtracao.message} theme={theme} />}
                        <button type="submit" disabled={loadingExtracao || !fileExtracao} className="w-full font-semibold py-3.5 rounded-xl text-sm bg-purple-600 text-white">
                            {loadingExtracao ? 'Processando...' : 'Importar Extração'}
                        </button>
                    </form>
                </div>

                <div className="glass rounded-3xl p-8 border border-white/5 relative overflow-hidden group/card flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Database size={120} /></div>
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Processamento Automático</h3>
                            </div>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center mb-8">
                            {!enriching ? (
                                <p className="text-[11px] text-gray-400 leading-relaxed">Escolha uma operação abaixo para processar seus leads.</p>
                            ) : (
                                <div className="w-full space-y-4">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Progresso Total</span>
                                        <span className="text-sm font-black text-white font-mono">{Math.round((enrichProgress.current / enrichProgress.total) * 100)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{ width: `${(enrichProgress.current / enrichProgress.total) * 100}%` }} />
                                    </div>
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest animate-pulse text-center block">Processando {enrichProgress.current}/{enrichProgress.total}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-3">
                        {!enriching ? (
                            <>
                                <button onClick={handleAutoConsultar} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border border-white/5 flex items-center justify-center gap-3">
                                    <Database size={16} className="text-gray-400" /> Enriquecer CPFs
                                </button>
                                <button onClick={handleCheckWhatsapp} className="w-full py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 flex items-center justify-center gap-3">
                                    <MessageSquare size={16} /> Verificar WhatsApp
                                </button>
                            </>
                        ) : (
                            <button onClick={() => shouldStopEnrich.current = true} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border border-rose-500/20 flex items-center justify-center gap-3">
                                <XCircle size={16} /> Parar Processo
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                    <div className="bg-black/40 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Console do Sistema</span>
                        <button onClick={() => setLogs([])} className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-widest">Limpar</button>
                    </div>
                    <div ref={terminalRef} className="h-48 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed">
                        {logs.length === 0 ? <div className="text-center text-gray-700 italic pt-12">Aguardando atividades...</div> : (
                            <div className="space-y-1">
                                {logs.map((log, idx) => (
                                    <div key={idx} className={log.includes('✅') || log.includes('✨') ? 'text-emerald-400/80' : log.includes('❌') || log.includes('🚨') ? 'text-rose-400/80' : 'text-gray-400'}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        )}
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
        emerald: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
        yellow: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
        purple: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7' },
        blue: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
    }
    const c = accent ? colors[accent] : { bg: `rgba(${theme.primaryRGB}, 0.1)`, text: theme.primary }
    return (
        <div className={`glass rounded-2xl p-5 animate-fade-in-up ${delay} relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background: c.bg }}>
                    <div style={{ color: c.text }}>{icon}</div>
                </div>
                <ArrowUpRight size={14} className="text-gray-700" />
            </div>
            <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600 mt-0.5 font-semibold uppercase tracking-wider">{label}</p>
        </div>
    )
}

function StatusAlert({ type, message, theme }: { type: 'success' | 'error'; message: string; theme: any }) {
    return (
        <div className={`p-3 rounded-xl flex items-center gap-2.5 ${type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <p className="text-xs font-medium">{message}</p>
        </div>
    )
}
