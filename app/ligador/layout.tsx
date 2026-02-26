'use client'

import { useRouter } from 'next/navigation'
import { Zap, LogOut } from 'lucide-react'

export default function LigadorLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Top Bar */}
            <header className="bg-[#080808] border-b border-white/[0.04] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white">VS Trampos</h1>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest">Painel do Ligador</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all text-sm"
                >
                    <LogOut size={16} />
                    Sair
                </button>
            </header>

            <main className="p-6 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    )
}
