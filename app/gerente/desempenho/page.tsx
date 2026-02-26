'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Users, Trophy, TrendingUp, RefreshCw, CheckCircle2, XCircle, Clock, Target, Award } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function GerenteDesempenho() {
    const { theme, selectedBankId, selectedBankName } = useBankTheme()
    const [ligadores, setLigadores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (selectedBankId) carregarDesempenho()
    }, [selectedBankId])

    const carregarDesempenho = async () => {
        setLoading(true)
        const { data: ligsData } = await supabase.from('ligadores').select('*').order('nome')

        if (ligsData) {
            const enriched = await Promise.all(ligsData.map(async (lig) => {
                // Todas as fichas deste ligador neste banco
                const { data: fichas } = await supabase.from('clientes').select('status_ficha, motivo_conclusao, concluido_em').eq('atribuido_a', lig.id).eq('banco_principal_id', selectedBankId!)

                const total = fichas?.length || 0
                const concluidas = fichas?.filter(f => f.status_ficha) || []
                const sucesso = fichas?.filter(f => f.status_ficha === 'concluido_sucesso') || []
                const erro = fichas?.filter(f => f.status_ficha === 'concluido_erro') || []
                const pendentes = total - concluidas.length

                // Últimas conclusões
                const ultimasConclusoes = concluidas
                    .sort((a, b) => new Date(b.concluido_em || 0).getTime() - new Date(a.concluido_em || 0).getTime())
                    .slice(0, 5)

                return {
                    ...lig,
                    total,
                    concluidas: concluidas.length,
                    sucesso: sucesso.length,
                    erro: erro.length,
                    pendentes,
                    taxaSucesso: concluidas.length > 0 ? Math.round((sucesso.length / concluidas.length) * 100) : 0,
                    taxaConclusao: total > 0 ? Math.round((concluidas.length / total) * 100) : 0,
                    ultimasConclusoes
                }
            }))

            // Ordena por taxa de conclusão (mais produtivo primeiro)
            enriched.sort((a, b) => b.taxaConclusao - a.taxaConclusao)
            setLigadores(enriched)
        }
        setLoading(false)
    }

    const melhorLigador = ligadores.length > 0 ? ligadores[0] : null

    return (
        <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <BarChart3 size={24} style={{ color: theme.primary }} /> Desempenho
                    </h1>
                    <p className="text-gray-600 text-sm mt-1">Análise detalhada de cada ligador • {selectedBankName}</p>
                </div>
                <button onClick={carregarDesempenho} className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-gray-400 hover:text-white transition-all text-sm">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
                </button>
            </div>

            {/* Destaque: Melhor Ligador */}
            {melhorLigador && melhorLigador.total > 0 && (
                <div className="glass rounded-2xl p-6 mb-8 animate-fade-in-up border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><Trophy size={120} /></div>
                    <div className="flex items-center gap-2 mb-4">
                        <Award size={18} className="text-amber-400" />
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Destaque do Banco</p>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, #f59e0b)` }}>
                            {melhorLigador.nome.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{melhorLigador.nome}</p>
                            <p className="text-sm text-gray-500">{melhorLigador.taxaConclusao}% das fichas concluídas • {melhorLigador.taxaSucesso}% de sucesso</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Cards por Ligador */}
            <div className="space-y-6">
                {ligadores.map((lig, i) => (
                    <div key={lig.id} className="glass rounded-2xl p-6 animate-fade-in-up border border-white/5" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}66)` }}>
                                    {lig.nome.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-white">{lig.nome}</p>
                                    <p className="text-[10px] text-gray-600 font-mono">@{lig.login}</p>
                                </div>
                            </div>
                            {i === 0 && lig.total > 0 && <Trophy size={20} className="text-amber-400" />}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                            {[
                                { label: 'Total', value: lig.total, color: theme.primary, icon: <Target size={14} /> },
                                { label: 'Concluídas', value: lig.concluidas, color: '#3b82f6', icon: <CheckCircle2 size={14} /> },
                                { label: 'Sucesso', value: lig.sucesso, color: '#22c55e', icon: <CheckCircle2 size={14} /> },
                                { label: 'Sem Sucesso', value: lig.erro, color: '#ef4444', icon: <XCircle size={14} /> },
                                { label: 'Pendentes', value: lig.pendentes, color: '#eab308', icon: <Clock size={14} /> },
                            ].map((stat, j) => (
                                <div key={j} className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.03]">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span style={{ color: stat.color }}>{stat.icon}</span>
                                        <span className="text-[9px] font-bold text-gray-600 uppercase">{stat.label}</span>
                                    </div>
                                    <p className="text-lg font-black text-white">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Barras de progresso */}
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-1">
                                    <span>Taxa de Conclusão</span>
                                    <span className="text-white">{lig.taxaConclusao}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${lig.taxaConclusao}%`, background: `linear-gradient(to right, ${theme.primary}, #3b82f6)` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-1">
                                    <span>Taxa de Sucesso</span>
                                    <span className="text-emerald-400">{lig.taxaSucesso}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${lig.taxaSucesso}%`, background: `linear-gradient(to right, #22c55e, #16a34a)` }} />
                                </div>
                            </div>
                        </div>

                        {/* Últimas conclusões */}
                        {lig.ultimasConclusoes.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[9px] font-bold text-gray-700 uppercase tracking-wider mb-2">Últimas Conclusões</p>
                                <div className="space-y-1.5">
                                    {lig.ultimasConclusoes.map((c: any, j: number) => (
                                        <div key={j} className="flex items-center gap-2 text-xs">
                                            {c.status_ficha === 'concluido_sucesso' ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-rose-500" />}
                                            <span className="text-gray-400 flex-1 truncate">{c.motivo_conclusao || 'Sem motivo'}</span>
                                            <span className="text-[10px] text-gray-700">{c.concluido_em ? new Date(c.concluido_em).toLocaleDateString('pt-BR') : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {ligadores.length === 0 && !loading && (
                <div className="text-center py-20 glass rounded-3xl border border-dashed border-white/5">
                    <Users className="mx-auto text-gray-800 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Nenhum ligador cadastrado</p>
                </div>
            )}
        </div>
    )
}
