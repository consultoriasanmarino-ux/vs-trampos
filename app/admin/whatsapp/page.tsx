'use client'

import { useState, useEffect } from 'react'
import { QrCode, WifiOff, Info, CheckCircle2, RefreshCw } from 'lucide-react'
import { useBankTheme } from '@/lib/bank-theme'
import { supabase } from '@/lib/supabase'

interface WhatsappConfig {
    id: number
    status: string
    qr_code: string | null
    updated_at: string
}

export default function WhatsAppPage() {
    const { theme } = useBankTheme()
    const [config, setConfig] = useState<WhatsappConfig | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        carregarConfig()

        // Inscreve no Realtime para atualizações instantâneas
        const channel = supabase
            .channel('whatsapp_status')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'config_whatsapp'
            }, (payload) => {
                console.log('Update received!', payload)
                setConfig(payload.new as WhatsappConfig)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const carregarConfig = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('config_whatsapp')
            .select('*')
            .single()

        if (data) setConfig(data)
        setLoading(false)
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-white tracking-tight">WhatsApp (Baileys)</h1>
                <p className="text-gray-600 text-sm mt-1">Configure a integração com o WhatsApp via Baileys.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QR Code / Status */}
                <div className="glass rounded-2xl p-8 card-hover animate-fade-in-up stagger-1">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-green-500/10">
                                <QrCode className="text-green-500" size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-white">Status da Conexão</h2>
                                <p className="text-xs text-gray-600">Sincronizado com o servidor local</p>
                            </div>
                        </div>
                        <button
                            onClick={carregarConfig}
                            className="p-2 text-gray-500 hover:text-white transition-colors"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="aspect-square max-w-[320px] mx-auto glass rounded-2xl flex flex-col items-center justify-center gap-4 mb-6 relative overflow-hidden">
                        {config?.status === 'connected' ? (
                            <div className="text-center animate-fade-in">
                                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                    <CheckCircle2 size={40} className="text-green-500" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Conectado!</h3>
                                <p className="text-sm text-gray-500">Seu WhatsApp está pronto para uso.</p>
                            </div>
                        ) : config?.qr_code ? (
                            <div className="p-4 bg-white rounded-xl shadow-2xl animate-fade-in">
                                <img src={config.qr_code} alt="WhatsApp QR Code" className="w-[240px] h-[240px]" />
                            </div>
                        ) : (
                            <div className="text-center opacity-40">
                                <QrCode size={80} className="mx-auto mb-4" />
                                <p className="text-sm font-medium">Aguardando servidor...</p>
                            </div>
                        )}

                        {/* Shimmer overlay only when loading or waiting for QR */}
                        {!config && <div className="absolute inset-0 bg-white/[0.02] animate-shimmer" />}
                    </div>

                    {/* Status Badge */}
                    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${config?.status === 'connected'
                            ? 'bg-green-500/10 border border-green-500/20'
                            : config?.status === 'qr_ready'
                                ? 'bg-blue-500/10 border border-blue-500/20'
                                : 'bg-yellow-500/5 border border-yellow-500/10'
                        }`}>
                        {config?.status === 'connected' ? (
                            <>
                                <CheckCircle2 size={16} className="text-green-500" />
                                <div>
                                    <p className="text-xs font-semibold text-green-400">WhatsApp Conectado</p>
                                    <p className="text-[10px] text-gray-600">Servidor online e pronto</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <WifiOff size={16} className="text-yellow-500" />
                                <div>
                                    <p className="text-xs font-semibold text-yellow-400">
                                        {config?.status === 'qr_ready' ? 'Aguardando Leitura' : 'Desconectado'}
                                    </p>
                                    <p className="text-[10px] text-gray-600">Inicie o terminal localmente</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Info & Setup */}
                <div className="space-y-6">
                    <div className="glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl" style={{ background: `rgba(${theme.primaryRGB}, 0.1)` }}>
                                <Info size={20} style={{ color: theme.primary }} />
                            </div>
                            <h3 className="text-base font-semibold text-white">Instruções do Servidor</h3>
                        </div>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 bg-white/5 text-white">1</span>
                                <div>
                                    <p className="text-white font-medium">Instale as dependências</p>
                                    <p className="text-[11px] text-gray-600 font-mono mt-1">cd wpp && npm install</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 bg-white/5 text-white">2</span>
                                <div>
                                    <p className="text-white font-medium">Inicie o servidor</p>
                                    <p className="text-[11px] text-gray-600 font-mono mt-1">npm start</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 bg-white/5 text-white">3</span>
                                <div>
                                    <p className="text-white font-medium">Reconexão automática</p>
                                    <p className="text-[11px] text-gray-600">A sessão é salva na pasta <span className="text-violet-400 font-mono">auth_info_baileys</span>. Se fechar o terminal e abrir depois, ele reconecta sozinho!</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-3">
                        <h3 className="text-base font-semibold text-white mb-4">Classificação de Números</h3>
                        <div className="space-y-3">
                            {[
                                { color: '#22c55e', label: 'WhatsApp Ativo', desc: 'Celular com 11 dígitos (DDD + 9xxxx-xxxx)' },
                                { color: '#eab308', label: 'Telefone Fixo', desc: 'Número com 10 dígitos (DDD + xxxx-xxxx)' },
                                { color: '#ef4444', label: 'Inválido', desc: 'Menos de 10 dígitos ou formato incorreto' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                                    <div>
                                        <p className="text-sm text-white font-medium">{item.label}</p>
                                        <p className="text-xs text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
