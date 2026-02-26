'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Landmark,
    Users,
    MessageCircle,
    LogOut,
    Zap,
    UserCog,
} from 'lucide-react'

const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/bancos', icon: Landmark, label: 'Bancos' },
    { href: '/admin/leads', icon: Users, label: 'Leads' },
    { href: '/admin/ligadores', icon: UserCog, label: 'Ligadores' },
    { href: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    return (
        <div className="flex min-h-screen bg-[#050505]">
            {/* Sidebar */}
            <aside className="w-[260px] bg-[#080808] border-r border-white/[0.04] flex flex-col fixed h-full z-50">
                {/* Logo */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-white tracking-tight">VS Trampos</h1>
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest">Admin Panel</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 mt-4 space-y-1">
                    <p className="px-4 text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">Menu</p>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
                                    }`}
                            >
                                <Icon size={18} className={isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-400'} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-white/[0.04]">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all text-sm font-medium"
                    >
                        <LogOut size={18} />
                        Sair do Sistema
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 ml-[260px] min-h-screen">
                {children}
            </main>
        </div>
    )
}
