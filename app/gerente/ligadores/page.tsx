'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Users, UserPlus, Search, RefreshCw, CheckCircle2, XCircle, Clock, Plus, Trash2, Save, Eye, EyeOff } from 'lucide-react'
import { supabase, Ligador } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function GerenteLigadores() {
    const { theme, selectedBankId } = useBankTheme()
    const [ligadores, setLigadores] = useState<Ligador[]>([])
    const [ligadorStats, setLigadorStats] = useState<Record<string, { total: number; concluidos: number; sucesso: number }>>({})
    const [loading, setLoading] = useState(true)

    // Criar ligador
    const [showForm, setShowForm] = useState(false)
    const [formNome, setFormNome] = useState('')
    const [formLogin, setFormLogin] = useState('')
    const [formSenha, setFormSenha] = useState('')
    const [showSenha, setShowSenha] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => { carregarLigadores() }, [selectedBankId])

    const carregarLigadores = async () => {
        setLoading(true)
        const { data } = await supabase.from('ligadores').select('*').order('nome')
        if (data) {
            setLigadores(data)
            // Carregar stats para cada ligador
            const statsMap: Record<string, { total: number; concluidos: number; sucesso: number }> = {}
            for (const lig of data) {
                const { count: total } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('atribuido_a', lig.id)
                const { count: concluidos } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('atribuido_a', lig.id).not('status_ficha', 'is', null)
                const { count: sucesso } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('atribuido_a', lig.id).eq('status_ficha', 'concluido_sucesso')
                statsMap[lig.id] = { total: total || 0, concluidos: concluidos || 0, sucesso: sucesso || 0 }
            }
            setLigadorStats(statsMap)
        }
        setLoading(false)
    }

    const handleCriarLigador = async () => {
        if (!formNome || !formLogin || !formSenha) return alert('Preencha todos os campos.')
        setSaving(true)
        const { error } = await supabase.from('ligadores').insert({ nome: formNome, login: formLogin, senha_hash: formSenha })
        if (error) {
            alert('Erro ao criar ligador: ' + error.message)
        } else {
            setFormNome('')
            setFormLogin('')
            setFormSenha('')
            setShowForm(false)
            carregarLigadores()
        }
        setSaving(false)
    }

    const handleExcluir = async (id: string, nome: string) => {
        if (!confirm(`Deseja excluir o ligador "${nome}"? As fichas atribuídas a ele NÃO serão excluídas.`)) return
        await supabase.from('clientes').update({ atribuido_a: null }).eq('atribuido_a', id)
        await supabase.from('ligadores').delete().eq('id', id)
        carregarLigadores()
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Ligadores</h1>
                    <p className="text-gray-600 text-sm mt-1">Gerencie a equipe e acompanhe o desempenho</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}88)` }}>
                        <Plus size={16} /> Novo Ligador
                    </button>
                    <button onClick={carregarLigadores} className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-gray-400 hover:text-white transition-all text-sm">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Formulário de criação */}
            {showForm && (
                <div className="glass rounded-2xl p-6 mb-8 animate-fade-in-up border border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Cadastrar Novo Ligador</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Nome Completo</label>
                            <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="João Silva" className="w-full bg-[#080808] border border-white/5 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': theme.primary + '33' } as any} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Usuário (Login)</label>
                            <input type="text" value={formLogin} onChange={e => setFormLogin(e.target.value)} placeholder="joao.silva" className="w-full bg-[#080808] border border-white/5 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 font-mono" style={{ '--tw-ring-color': theme.primary + '33' } as any} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Senha</label>
                            <div className="relative">
                                <input type={showSenha ? 'text' : 'password'} value={formSenha} onChange={e => setFormSenha(e.target.value)} placeholder="••••••" className="w-full bg-[#080808] border border-white/5 rounded-xl py-3 px-4 pr-12 text-white text-sm focus:outline-none focus:ring-2 font-mono" style={{ '--tw-ring-color': theme.primary + '33' } as any} />
                                <button onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleCriarLigador} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}88)` }}>
                        <Save size={16} /> {saving ? 'Salvando...' : 'Criar Ligador'}
                    </button>
                </div>
            )}

            {/* Lista de ligadores */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ligadores.map((lig, i) => {
                    const stats = ligadorStats[lig.id] || { total: 0, concluidos: 0, sucesso: 0 }
                    const taxa = stats.total > 0 ? Math.round((stats.concluidos / stats.total) * 100) : 0
                    return (
                        <div key={lig.id} className="glass rounded-2xl p-6 card-hover animate-fade-in-up border border-white/5 relative overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}66)` }}>
                                        {lig.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{lig.nome}</p>
                                        <p className="text-[10px] text-gray-600 font-mono">@{lig.login}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleExcluir(lig.id, lig.nome)} className="p-2 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                                    <p className="text-lg font-black text-white">{stats.total}</p>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase">Fichas</p>
                                </div>
                                <div className="bg-emerald-500/5 rounded-xl p-3 text-center">
                                    <p className="text-lg font-black text-emerald-400">{stats.sucesso}</p>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase">Sucesso</p>
                                </div>
                                <div className="bg-amber-500/5 rounded-xl p-3 text-center">
                                    <p className="text-lg font-black text-amber-400">{stats.total - stats.concluidos}</p>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase">Pendentes</p>
                                </div>
                            </div>

                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${taxa}%`, background: `linear-gradient(to right, ${theme.primary}, #22c55e)` }} />
                            </div>
                            <p className="text-[10px] text-gray-600 mt-2 text-right font-bold">{taxa}% concluído</p>
                        </div>
                    )
                })}
            </div>

            {ligadores.length === 0 && !loading && (
                <div className="text-center py-20 glass rounded-3xl border border-dashed border-white/5">
                    <Users className="mx-auto text-gray-800 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Nenhum ligador cadastrado</p>
                    <p className="text-gray-700 text-sm mt-1">Clique em "Novo Ligador" para começar.</p>
                </div>
            )}
        </div>
    )
}
