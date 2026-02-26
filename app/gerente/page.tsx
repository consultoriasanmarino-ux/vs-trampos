'use client'

import { useState, useEffect } from 'react'
import { Users, CreditCard, CheckCircle2, XCircle, Clock, TrendingUp, ArrowUpRight, RefreshCw, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function GerenteDashboard() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()
    const [stats, setStats] = useState({ total: 0, pendentes: 0, sucesso: 0, erro: 0, ligadores: 0 })
    const [ligadoresStats, setLigadoresStats] = useState<any[]>([])

    useEffect(() => {
        if (selectedBankId) carregarStats()
    }, [selectedBankId])

    const carregarStats = async () => {
        // Total de fichas
        const { count: total } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('banco_principal_id', selectedBankId!)
        const { count: pendentes } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('banco_principal_id', selectedBankId!).is('status_ficha', null)
        const { count: sucesso } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('banco_principal_id', selectedBankId!).eq('status_ficha', 'concluido_sucesso')
        const { count: erro } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('banco_principal_id', selectedBankId!).eq('status_ficha', 'concluido_erro')

        // Ligadores
        const { data: ligadores } = await supabase.from('ligadores').select('id, nome')

        // Stats por ligador
        if (ligadores) {
            const statsLigadores = await Promise.all(ligadores.map(async (lig) => {
                const { count: atribuidas } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('atribuido_a', lig.id).eq('banco_principal_id', selectedBankId!)
                const { count: concluidas } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('atribuido_a', lig.id).eq('banco_principal_id', selectedBankId!).not('status_ficha', 'is', null)
                const { count: sucessoLig } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('atribuido_a', lig.id).eq('banco_principal_id', selectedBankId!).eq('status_ficha', 'concluido_sucesso')
                return { ...lig, atribuidas: atribuidas || 0, concluidas: concluidas || 0, sucesso: sucessoLig || 0 }
            }))
            setLigadoresStats(statsLigadores)
        }

        setStats({
            total: total || 0,
            pendentes: pendentes || 0,
            sucesso: sucesso || 0,
            erro: erro || 0,
            ligadores: ligadores?.length || 0
        })
    }

    const taxaSucesso = stats.sucesso + stats.erro > 0 ? Math.round((stats.sucesso / (stats.sucesso + stats.erro)) * 100) : 0

    return (
        <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        Dashboard do Gerente
                        {selectedBankName && (
                            <span className="text-sm font-semibold px-3 py-1 rounded-lg" style={{ background: `rgba(${theme.primaryRGB}, 0.1)`, color: theme.primary }}>
                                {selectedBankName}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-600 text-sm mt-1">Acompanhe o desempenho da equipe</p>
                </div>
                <button onClick={carregarStats} className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-gray-400 hover:text-white transition-all text-sm group">
                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" /> Atualizar
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {[
                    { icon: <CreditCard size={20} />, label: 'Total Fichas', value: stats.total, color: theme.primary, bg: `rgba(${theme.primaryRGB}, 0.1)` },
                    { icon: <Clock size={20} />, label: 'Pendentes', value: stats.pendentes, color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
                    { icon: <CheckCircle2 size={20} />, label: 'Sucesso', value: stats.sucesso, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
                    { icon: <XCircle size={20} />, label: 'Sem Sucesso', value: stats.erro, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
                    { icon: <Users size={20} />, label: 'Ligadores', value: stats.ligadores, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
                ].map((stat, i) => (
                    <div key={i} className="glass rounded-2xl p-5 card-hover animate-fade-in-up relative overflow-hidden" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg" style={{ background: stat.bg }}>
                                <div style={{ color: stat.color }}>{stat.icon}</div>
                            </div>
                            <ArrowUpRight size={14} className="text-gray-700" />
                        </div>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5 font-semibold uppercase tracking-wider">{stat.label}</p>
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-30" style={{ background: `linear-gradient(to right, transparent, ${stat.color}, transparent)` }} />
                    </div>
                ))}
            </div>

            {/* Taxa de Sucesso */}
            <div className="glass rounded-2xl p-6 mb-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-3 mb-4">
                    <TrendingUp size={20} style={{ color: theme.primary }} />
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">Taxa de Sucesso Geral</h2>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-5xl font-black text-white">{taxaSucesso}%</div>
                    <div className="flex-1">
                        <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${taxaSucesso}%`, background: `linear-gradient(to right, ${theme.primary}, #22c55e)` }} />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-600 uppercase">
                            <span>{stats.sucesso} Sucessos</span>
                            <span>{stats.erro} Sem Sucesso</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance por Ligador */}
            <div className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 size={20} style={{ color: theme.primary }} />
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">Desempenho por Ligador</h2>
                </div>
                <div className="space-y-4">
                    {ligadoresStats.map((lig) => {
                        const taxa = lig.atribuidas > 0 ? Math.round((lig.concluidas / lig.atribuidas) * 100) : 0
                        return (
                            <div key={lig.id} className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}66)` }}>
                                            {lig.nome.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{lig.nome}</p>
                                            <p className="text-[10px] text-gray-600 font-bold uppercase">{lig.atribuidas} fichas atribuídas</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white">{taxa}%</p>
                                        <p className="text-[9px] text-gray-600 uppercase font-bold">{lig.concluidas} concluídas</p>
                                    </div>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${taxa}%`, background: `linear-gradient(to right, ${theme.primary}, #22c55e)` }} />
                                </div>
                                <div className="flex gap-4 mt-3 text-[10px] font-bold text-gray-600">
                                    <span className="text-emerald-500">{lig.sucesso} ✓ Sucesso</span>
                                    <span className="text-rose-500">{lig.concluidas - lig.sucesso} ✕ Sem sucesso</span>
                                    <span className="text-amber-500">{lig.atribuidas - lig.concluidas} ● Pendentes</span>
                                </div>
                            </div>
                        )
                    })}
                    {ligadoresStats.length === 0 && (
                        <div className="text-center py-12 opacity-40">
                            <Users className="mx-auto text-gray-700 mb-4" size={48} />
                            <p className="text-sm text-gray-600">Nenhum ligador cadastrado ainda</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
