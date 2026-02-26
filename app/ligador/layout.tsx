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
        <div className="min-h-screen bg-[#030303] relative overflow-hidden">
            {/* Animated background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-grid opacity-30 animate-grid-move" />
                <div className="orb w-[400px] h-[400px] -top-32 -right-32 opacity-15 bg-blue-600/20" />
                <div className="orb w-[300px] h-[300px] bottom-0 left-1/4 opacity-10 animate-float-slow bg-violet-600/20" />
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full animate-float"
                        style={{
                            width: `${3 + i}px`,
                            height: `${3 + i}px`,
                            background: `rgba(124, 58, 237, ${0.15 + i * 0.05})`,
                            top: `${20 + i * 20}%`,
                            left: `${10 + i * 22}%`,
                            animationDelay: `${i * 2}s`,
                            animationDuration: `${7 + i * 2}s`,
                        }}
                    />
                ))}
            </div>

            {/* Top Bar */}
            <header className="glass-strong px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-600/30 to-purple-700/15 rounded-xl flex items-center justify-center border border-violet-500/20">
                        <Zap className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white">VS Trampos</h1>
                        <p className="text-[9px] text-violet-500 uppercase tracking-[0.2em] font-semibold">Painel do Ligador</p>
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

            <main className="p-6 max-w-7xl mx-auto relative z-10">
                {children}
            </main>
        </div>
    )
}
