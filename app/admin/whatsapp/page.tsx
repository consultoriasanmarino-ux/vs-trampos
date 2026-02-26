'use client'

import { QrCode, WifiOff, Info } from 'lucide-react'
import { useBankTheme } from '@/lib/bank-theme'

export default function WhatsAppPage() {
    const { theme } = useBankTheme()

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-white tracking-tight">WhatsApp (Baileys)</h1>
                <p className="text-gray-600 text-sm mt-1">Configure a integração com o WhatsApp via Baileys.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="glass rounded-2xl p-8 card-hover animate-fade-in-up stagger-1">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl bg-green-500/10">
                            <QrCode className="text-green-500" size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">QR Code</h2>
                            <p className="text-xs text-gray-600">Escaneie para conectar o WhatsApp</p>
                        </div>
                    </div>

                    <div className="aspect-square max-w-[280px] mx-auto glass rounded-2xl flex flex-col items-center justify-center gap-4 mb-6 animate-pulse-glow">
                        <QrCode className="text-gray-700" size={80} />
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">QR Code aparece aqui</p>
                            <p className="text-xs text-gray-700 mt-1">Conecte o servidor Baileys</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl px-4 py-3">
                        <WifiOff size={16} className="text-yellow-500" />
                        <div>
                            <p className="text-xs font-semibold text-yellow-400">Desconectado</p>
                            <p className="text-[10px] text-gray-600">Aguardando servidor Baileys</p>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="space-y-6">
                    <div className="glass rounded-2xl p-6 card-hover animate-fade-in-up stagger-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl" style={{ background: `rgba(${theme.primaryRGB}, 0.1)` }}>
                                <Info size={20} style={{ color: theme.primary }} />
                            </div>
                            <h3 className="text-base font-semibold text-white">Como Funciona</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-gray-400">
                            {['Inicie o servidor Baileys no backend separado.', 'O QR Code aparecerá nesta tela automaticamente.', 'Escaneie com o WhatsApp do número desejado.', 'Números importados serão validados automaticamente.'].map((txt, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                                        style={{ background: `rgba(${theme.primaryRGB}, 0.1)`, color: theme.primary }}>{i + 1}</span>
                                    {txt}
                                </li>
                            ))}
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
