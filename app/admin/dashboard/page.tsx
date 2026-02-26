'use client'

import { useState } from 'react'
import {
    BarChart3,
    Users,
    Upload,
    Settings,
    LayoutDashboard,
    LogOut,
    FileText,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'

export default function AdminDashboard() {
    const [file, setFile] = useState<File | null>(null)
    const [banco, setBanco] = useState('')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || !banco) return

        setLoading(true)
        setStatus(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('banco', banco)

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (response.ok) {
                setStatus({ type: 'success', message: data.message })
                setFile(null)
                setBanco('')
            } else {
                setStatus({ type: 'error', message: data.error || 'Erro ao importar arquivo.' })
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Erro de conexão com o servidor.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen bg-[#050505] text-gray-200">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs">VS</span>
                        VS CRM
                    </h2>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
                    <SidebarItem icon={<Users size={20} />} label="Clientes" />
                    <SidebarItem icon={<BarChart3 size={20} />} label="Relatórios" />
                    <SidebarItem icon={<Settings size={20} />} label="Configurações" />
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <LogOut size={20} />
                        <span className="font-medium text-sm">Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Administrativo</h1>
                    <p className="text-gray-500 mt-1">Bem-vindo, osevenboy. Gerencie seus leads e bancos.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Upload Module */}
                    <section className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-600/10 rounded-lg">
                                <Upload className="text-blue-500" size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-white">Importar Leads (.txt)</h2>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Nome do Banco</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Itaú, Bradesco, PAN"
                                    value={banco}
                                    onChange={(e) => setBanco(e.target.value)}
                                    className="w-full bg-[#161616] border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Arquivo TXT (CPFs)</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-blue-500/40 transition-colors group cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept=".txt"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        required
                                    />
                                    <FileText className="mx-auto text-gray-600 group-hover:text-blue-500 mb-4 transition-colors" size={40} />
                                    <p className="text-sm text-gray-400">
                                        {file ? <span className="text-blue-400 font-medium">{file.name}</span> : 'Arraste ou clique para selecionar o arquivo .txt'}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-2">Apenas arquivos .txt com um CPF por linha</p>
                                </div>
                            </div>

                            {status && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <p className="text-sm font-medium">{status.message}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !file || !banco}
                                className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
                            >
                                {loading ? 'Processando...' : 'Iniciar Importação'}
                            </button>
                        </form>
                    </section>

                    {/* Quick Stats or Instructions */}
                    <section className="space-y-8">
                        <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-8">
                            <h3 className="text-lg font-semibold text-white mb-4">Dicas de Importação</h3>
                            <ul className="space-y-4 text-sm text-gray-400">
                                <li className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    Certifique-se que o arquivo .txt não contenha cabeçalhos.
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    Os CPFs podem conter máscara (123.456...) ou apenas números.
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    O sistema irá vincular automaticamente todos os CPFs ao banco informado.
                                </li>
                            </ul>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <StatusCard label="Total Clientes" value="0" />
                            <StatusCard label="Importações hoje" value="0" />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <button className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-medium text-sm ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            {icon}
            {label}
        </button>
    )
}

function StatusCard({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
    )
}
