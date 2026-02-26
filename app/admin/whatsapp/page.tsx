'use client'

import { QrCode, Wifi, WifiOff, Info } from 'lucide-react'

export default function WhatsAppPage() {
    return (
        <div className="p-8">
            <div className="mb-10">
                <h1 className="text-2xl font-bold text-white tracking-tight">WhatsApp (Baileys)</h1>
                <p className="text-gray-600 text-sm mt-1">Configure a integração com o WhatsApp via Baileys.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-green-500/10 rounded-xl">
                            <QrCode className="text-green-500" size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">QR Code</h2>
                            <p className="text-xs text-gray-600">Escaneie para conectar o WhatsApp</p>
                        </div>
                    </div>

                    {/* QR Placeholder */}
                    <div className="aspect-square max-w-[280px] mx-auto bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl flex flex-col items-center justify-center gap-4 mb-6">
                        <QrCode className="text-gray-700" size={80} />
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">QR Code aparece aqui</p>
                            <p className="text-xs text-gray-700 mt-1">Conecte o servidor Baileys</p>
                        </div>
                    </div>

                    {/* Status de Conexão */}
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
                    <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-500/10 rounded-xl">
                                <Info className="text-blue-500" size={20} />
                            </div>
                            <h3 className="text-base font-semibold text-white">Como Funciona</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-blue-500/10 rounded-md flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">1</span>
                                Inicie o servidor Baileys no backend separado.
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-blue-500/10 rounded-md flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">2</span>
                                O QR Code aparecerá nesta tela automaticamente.
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-blue-500/10 rounded-md flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">3</span>
                                Escaneie com o WhatsApp do número desejado.
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-blue-500/10 rounded-md flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">4</span>
                                Os números importados serão validados automaticamente.
                            </li>
                        </ul>
                    </div>

                    <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-6">
                        <h3 className="text-base font-semibold text-white mb-4">Classificação de Números</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                <div>
                                    <p className="text-sm text-white font-medium">WhatsApp Ativo</p>
                                    <p className="text-xs text-gray-600">Celular com 11 dígitos (DDD + 9xxxx-xxxx)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                <div>
                                    <p className="text-sm text-white font-medium">Telefone Fixo</p>
                                    <p className="text-xs text-gray-600">Número com 10 dígitos (DDD + xxxx-xxxx)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <div>
                                    <p className="text-sm text-white font-medium">Inválido</p>
                                    <p className="text-xs text-gray-600">Menos de 10 dígitos ou formato incorreto</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
