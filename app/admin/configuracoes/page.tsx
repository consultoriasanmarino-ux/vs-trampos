'use client'

import { useState, useEffect } from 'react'
import {
    Settings,
    Save,
    Link as LinkIcon,
    Key,
    Globe,
    Database,
    Zap,
    CheckCircle2,
    AlertCircle,
    RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBankTheme } from '@/lib/bank-theme'

export default function ConfigPage() {
    const { theme } = useBankTheme()
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    // Form states
    const [apiUrl, setApiUrl] = useState('https://completa.workbuscas.com/api?token=TOKEN&modulo=MODULO&consulta=DOCUMENTO')
    const [apiToken, setApiToken] = useState('doavTXJphHLkpayfbdNdJyGp')

    useEffect(() => {
        carregarConfigs()
    }, [])

    const carregarConfigs = async () => {
        setLoading(true)
        try {
            // Tenta carregar do Supabase primeiro
            const { data, error } = await supabase.from('configuracoes').select('*')

            if (data && data.length > 0) {
                const urlObj = data.find(c => c.key === 'api_consulta_url')
                const tokenObj = data.find(c => c.key === 'api_consulta_token')

                if (urlObj) setApiUrl(urlObj.value)
                if (tokenObj) setApiToken(tokenObj.value)
            } else {
                // Se não tiver no banco, tenta localStorage como fallback
                const localUrl = localStorage.getItem('api_consulta_url')
                const localToken = localStorage.getItem('api_consulta_token')
                if (localUrl) setApiUrl(localUrl)
                if (localToken) setApiToken(localToken)
            }
        } catch (err) {
            console.error('Erro ao carregar configurações:', err)
        }
        setLoading(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setStatus(null)

        try {
            // Salva no LocalStorage para garantir funcionamento imediato
            localStorage.setItem('api_consulta_url', apiUrl)
            localStorage.setItem('api_consulta_token', apiToken)

            // Tenta salvar no Supabase
            const updates = [
                { key: 'api_consulta_url', value: apiUrl },
                { key: 'api_consulta_token', value: apiToken }
            ]

            const { error } = await supabase.from('configuracoes').upsert(updates, { onConflict: 'key' })

            if (error) {
                console.warn('Erro ao salvar no Supabase (ignorável se a tabela não existir):', error.message)
                setStatus({
                    type: 'success',
                    message: 'Configurações salvas localmente com sucesso! (Nota: Tabela no banco não encontrada, mas o sistema funcionará no seu navegador).'
                })
            } else {
                setStatus({ type: 'success', message: 'Configurações salvas no servidor com sucesso!' })
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: 'Erro ao salvar: ' + err.message })
        }
        setLoading(false)
    }

    return (
        <div className="p-6 md:p-10 animate-fade-in max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-10">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary + '33'})` }}
                >
                    <Settings className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight italic uppercase">Painel de Configurações</h1>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1">Gerencie APIs e integrações do sistema</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* API Section */}
                <div className="glass rounded-[2rem] p-8 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <Globe size={120} />
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                        <Zap size={20} style={{ color: theme.primary }} />
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">API de Consulta de CPF</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-1">URL da API (Webhook)</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-700 group-focus-within/input:text-white transition-colors">
                                    <LinkIcon size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={apiUrl}
                                    onChange={(e) => setApiUrl(e.target.value)}
                                    placeholder="https://sua-api.com/v1/search?token=..."
                                    className="w-full bg-[#080808] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-800 text-sm focus:outline-none focus:ring-2 transition-all font-mono"
                                    style={{ '--tw-ring-color': theme.primary + '33' } as any}
                                />
                            </div>
                            <p className="text-[9px] text-gray-700 italic pl-1 lowercase">Use placeholders: TOKEN, MODULO, DOCUMENTO</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-1">Secret Token / API Key</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-700 group-focus-within/input:text-white transition-colors">
                                    <Key size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={apiToken}
                                    onChange={(e) => setApiToken(e.target.value)}
                                    placeholder="Insira seu token de acesso..."
                                    className="w-full bg-[#080808] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-800 text-sm focus:outline-none focus:ring-2 transition-all font-mono"
                                    style={{ '--tw-ring-color': theme.primary + '33' } as any}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Messages */}
                {status && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-bounce-subtle border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                        {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <p className="text-xs font-black uppercase tracking-tight">{status.message}</p>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-3 px-10 py-5 rounded-[1.5rem] font-black uppercase text-sm tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50 group"
                        style={{
                            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary + '88'})`,
                            color: 'white'
                        }}
                    >
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Salvar Configurações
                    </button>
                </div>
            </form>

            <div className="mt-20 glass rounded-[2rem] p-8 border border-white/5 flex flex-col items-center text-center max-w-md mx-auto opacity-40">
                <Database className="text-gray-700 mb-4" size={32} />
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Instrução Técnica</h3>
                <p className="text-[11px] text-gray-600 mt-2">
                    Para persistência global (todos os usuários), crie a tabela <code className="bg-white/5 px-2 py-1 rounded">configuracoes</code> no seu SQL Editor do Supabase com as colunas <code className="bg-white/5 px-2 py-1 rounded">key (text PRIMARY KEY)</code> e <code className="bg-white/5 px-2 py-1 rounded">value (text)</code>.
                </p>
            </div>
        </div>
    )
}
