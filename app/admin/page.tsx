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
    Trash2,
    CreditCard,
} from 'lucide-react'
import { supabase, Banco } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function AdminDashboard() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()

    const [bancos, setBancos] = useState<Banco[]>([])
    const [fileCpf, setFileCpf] = useState<File | null>(null)
    const [fileEnriquecer, setFileEnriquecer] = useState<File | null>(null)
    const [fileExtracao, setFileExtracao] = useState<File | null>(null)
    const [loadingCpf, setLoadingCpf] = useState(false)
    const [loadingEnriquecer, setLoadingEnriquecer] = useState(false)
    const [loadingExtracao, setLoadingExtracao] = useState(false)
    const [statusCpf, setStatusCpf] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [statusEnriquecer, setStatusEnriquecer] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
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
        // Métrica clássica: faltam dados básicos (nome ou telefone)
        let queryIncompletos = supabase.from('clientes').select('*', { count: 'exact', head: true }).or('nome.is.null,nome.eq.,telefone.is.null,telefone.eq.')
        // Nova métrica: tem dados mas falta o robô do WhatsApp checar
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
            console.log('Iniciando consulta automática...')

            // Busca todos os leads sem nome (apenas CPF), sem telefone ou que ainda não foram verificados no WhatsApp
            let query = supabase.from('clientes')
                .select('id, cpf, nome, telefone')
                .or('nome.is.null,nome.eq.,telefone.is.null,telefone.eq.,wpp_checked.eq.false')
                .limit(2000)

            if (selectedBankId) query = query.eq('banco_principal_id', selectedBankId)

            const { data: leadsParaEnriquecer, error: queryError } = await query

            if (queryError) {
                alert('Erro ao buscar leads: ' + queryError.message)
                return
            }

            if (!leadsParaEnriquecer || leadsParaEnriquecer.length === 0) {
                alert('Não há fichas pendentes de consulta (todas já possuem nome e telefone).')
                return
            }

            if (!confirm(`Foram encontrados ${leadsParaEnriquecer.length} registro(s) pendentes de informação. Deseja realizar a consulta automática agora?`)) return

            setEnriching(true)
            setEnrichProgress({ current: 0, total: leadsParaEnriquecer.length })

            let apiUrl = localStorage.getItem('api_consulta_url') || 'https://completa.workbuscas.com/api?token={TOKEN}&modulo={MODULO}&consulta={PARAMETRO}'
            let apiToken = localStorage.getItem('api_consulta_token') || 'doavTXJphHLkpayfbdNdJyGp'
            let apiModulo = localStorage.getItem('api_consulta_modulo') || 'cpf'

            let apiWppUrl = localStorage.getItem('api_wpp_url') || 'https://api.ekycpro.com/v1/whatsapp'
            let apiWppToken = localStorage.getItem('api_wpp_token') || ''

            try {
                const { data: dbConfigs } = await supabase.from('configuracoes').select('*')
                if (dbConfigs) {
                    const urlObj = dbConfigs.find(c => c.key === 'api_consulta_url')
                    const tokenObj = dbConfigs.find(c => c.key === 'api_consulta_token')
                    const moduloObj = dbConfigs.find(c => c.key === 'api_consulta_modulo')
                    const wppUrlObj = dbConfigs.find(c => c.key === 'api_wpp_url')
                    const wppTokenObj = dbConfigs.find(c => c.key === 'api_wpp_token')

                    if (urlObj) apiUrl = urlObj.value
                    if (tokenObj) apiToken = tokenObj.value
                    if (moduloObj) apiModulo = moduloObj.value
                    if (wppUrlObj) apiWppUrl = wppUrlObj.value
                    if (wppTokenObj) apiWppToken = wppTokenObj.value
                }
            } catch (e) {
                console.warn('Erro ao ler configs do banco')
            }

            const batchSize = 5
            let totalSucessos = 0
            let totalErros = 0
            let totalExcluidos = 0
            const erroDetalhes: string[] = []

            for (let i = 0; i < leadsParaEnriquecer.length; i += batchSize) {
                const batch = leadsParaEnriquecer.slice(i, i + batchSize)

                try {
                    const res = await fetch('/api/consulta-cpf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            cpfs: batch,
                            apiUrl,
                            apiToken,
                            apiModulo,
                            apiWppUrl,
                            apiWppToken
                        })
                    })

                    const result = await res.json()

                    if (result.success) {
                        totalSucessos += result.sucessos || 0
                        totalErros += (result.erros || 0)
                        totalExcluidos += (result.excluidos || 0)
                        if (result.detalhes) {
                            result.detalhes.filter((d: any) => !d.sucesso).forEach((d: any) => {
                                erroDetalhes.push(`CPF ${d.cpf}: ${d.erro}`)
                            })
                        }
                    } else if (result.error) {
                        erroDetalhes.push(`Lote falhou: ${result.error}`)
                        totalErros += batch.length
                    }
                } catch (err: any) {
                    erroDetalhes.push(`Erro de rede: ${err.message}`)
                    totalErros += batch.length
                }

                setEnrichProgress({ current: Math.min(i + batchSize, leadsParaEnriquecer.length), total: leadsParaEnriquecer.length })
            }

            setEnriching(false)
            carregarStats()

            let msg = `Consulta finalizada!\n✨ Sucessos: ${totalSucessos}\n❌ Falhas: ${totalErros}\n🗑️ Excluídos por erro: ${totalExcluidos}`
            if (erroDetalhes.length > 0) {
                msg += `\n\n--- DETALHES DOS ERROS ---\n${erroDetalhes.slice(0, 5).join('\n')}`
                if (erroDetalhes.length > 5) msg += `\n... e mais ${erroDetalhes.length - 5} erros`
            }
            alert(msg)
        } catch (error: any) {
            console.error('Erro fatal no enrich:', error)
            alert('Erro inesperado: ' + error.message)
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
                <div className={`glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-2`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl transition-all duration-500" style={{ background: `rgba(${theme.primaryRGB}, 0.1)` }}>
                            <Upload size={20} style={{ color: theme.primary }} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Importar CPFs</h2>
                            <p className="text-xs text-gray-600">Vinculado ao <span style={{ color: theme.primary }} className="font-semibold">{selectedBankName || '...'}</span></p>
                        </div>
                    </div>
                    <form onSubmit={handleUploadCpf} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Arquivo TXT</label>
                            <div className="border border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer relative group" style={{ borderColor: `rgba(${theme.primaryRGB}, 0.15)` }}>
                                <input type="file" accept=".txt" onChange={(e) => setFileCpf(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <FileText className="mx-auto mb-3 transition-all duration-300 group-hover:scale-110" size={36} style={{ color: fileCpf ? theme.primary : 'rgb(50,50,50)' }} />
                                <p className="text-xs text-gray-500">
                                    {fileCpf ? <span style={{ color: theme.primary }} className="font-semibold">{fileCpf.name}</span> : 'Clique ou arraste o arquivo .txt'}
                                </p>
                                <p className="text-[10px] text-gray-700 mt-1">Um CPF por linha</p>
                            </div>
                        </div>
                        {statusCpf && <StatusAlert type={statusCpf.type} message={statusCpf.message} theme={theme} />}
                        <button type="submit" disabled={loadingCpf || !fileCpf || !selectedBankId} className="w-full text-white font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}cc)`, boxShadow: `0 4px 20px rgba(${theme.primaryRGB}, 0.3)` }}>
                            <div className="absolute inset-0 animate-shimmer" />
                            <span className="relative">{loadingCpf ? 'Processando...' : 'Importar CPFs'}</span>
                        </button>
                    </form>
                </div>

                {/* Card Importar Extração */}
                <div className={`glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-2 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <CreditCard size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl transition-all duration-500" style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
                            <CreditCard size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Importar Extração</h2>
                            <p className="text-xs text-gray-600">BIN • Validade • Nome • CPF</p>
                        </div>
                    </div>
                    <form onSubmit={handleUploadExtracao} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Arquivo log_extracao.txt</label>
                            <div className="border border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer relative group" style={{ borderColor: 'rgba(168, 85, 247, 0.15)' }}>
                                <input type="file" accept=".txt" onChange={(e) => setFileExtracao(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <CreditCard className="mx-auto mb-3 transition-all duration-300 group-hover:scale-110" size={36} style={{ color: fileExtracao ? '#a855f7' : 'rgb(50,50,50)' }} />
                                <p className="text-xs text-gray-500">
                                    {fileExtracao ? <span className="font-semibold text-purple-400">{fileExtracao.name}</span> : 'Clique ou arraste o arquivo .txt'}
                                </p>
                                <p className="text-[10px] text-gray-700 mt-1">Formato: #N | BIN | VAL | NOME | CPF</p>
                            </div>
                        </div>
                        {statusExtracao && <StatusAlert type={statusExtracao.type} message={statusExtracao.message} theme={theme} />}
                        <button type="submit" disabled={loadingExtracao || !fileExtracao || !selectedBankId} className="w-full text-white font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)' }}>
                            <div className="absolute inset-0 animate-shimmer" />
                            <span className="relative">{loadingExtracao ? 'Processando...' : 'Importar Extração'}</span>
                        </button>
                    </form>
                </div>

                <div className={`glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-3 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Cpu size={100} />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl transition-all duration-500" style={{ background: `rgba(${theme.primaryRGB}, 0.1)` }}>
                            <Zap size={20} style={{ color: theme.primary }} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white uppercase tracking-tight italic">Consultar Automático</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Enriquecer leads importados (Apenas CPFs)</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
                            <Database className="mx-auto mb-4 text-gray-700" size={48} />
                            <p className="text-sm text-gray-400 mb-2">Identificamos automaticamente os leads que possuem apenas o CPF e buscamos os dados na API configurada.</p>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">Nome • Idade • Renda • Score</p>
                        </div>
                        {enriching && (
                            <div className="space-y-3 px-1">
                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-gray-500">Progresso da Operação</span>
                                    <span style={{ color: theme.primary }}>{enrichProgress.current} / {enrichProgress.total}</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full transition-all duration-500 animate-pulse" style={{ width: enrichProgress.total > 0 ? `${(enrichProgress.current / enrichProgress.total) * 100}%` : '0%', background: `linear-gradient(to right, ${theme.primary}, ${theme.primary}88)` }} />
                                </div>
                            </div>
                        )}
                        <button onClick={handleAutoConsultar} disabled={enriching || totalClientes === 0} className="w-full flex items-center justify-center gap-3 font-black uppercase tracking-[0.15em] text-xs py-5 rounded-[1.2rem] shadow-2xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}88)`, color: 'white', boxShadow: `0 10px 40px rgba(${theme.primaryRGB}, 0.2)` }}>
                            {enriching ? (
                                <><RefreshCw className="animate-spin" size={18} /><span>Processando...</span></>
                            ) : (
                                <><Zap size={18} className="group-hover:scale-125 transition-transform" /><span>Iniciar Consulta Automática</span></>
                            )}
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
