'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import {
    LayoutDashboard,
    Landmark,
    CreditCard,
    LogOut,
    UserCog,
    ChevronDown,
    Sparkles,
    Zap,
    Menu,
    X,
    BarChart3,
    Eye
} from 'lucide-react'
import { supabase, Banco } from '@/lib/supabase'
import { BankThemeProvider, useBankTheme } from '@/lib/bank-theme'

const navItems = [
    { href: '/gerente', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/gerente/fichas', icon: CreditCard, label: 'Fichas' },
    { href: '/gerente/ligadores', icon: UserCog, label: 'Ligadores' },
    { href: '/gerente/desempenho', icon: BarChart3, label: 'Desempenho' },
    { href: '/admin/fichas-resumidas', icon: Eye, label: 'Fichas Resumidas' },
]

function GerenteContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { theme, selectedBankId, selectedBankName, setSelectedBank } = useBankTheme()
    const [bancos, setBancos] = useState<Banco[]>([])
    const [selectorOpen, setSelectorOpen] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [userName, setUserName] = useState('Gerente')
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const cookies = document.cookie.split(';').map(c => c.trim())
        const roleCookie = cookies.find(c => c.startsWith('vs_role='))
        if (roleCookie && roleCookie.split('=')[1] !== 'gerente' && roleCookie.split('=')[1] !== 'admin') {
            router.push('/login')
        }
    }, [])

    useEffect(() => {
        const carregarBancos = async () => {
            const { data } = await supabase.from('bancos').select('*').order('nome')
            if (data && data.length > 0) {
                setBancos(data)
                if (!selectedBankId) {
                    setSelectedBank(data[0].id, data[0].nome, data[0].cor)
                }
            } else if (data) {
                setBancos(data)
            }
        }
        carregarBancos()
    }, [selectedBankId])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setSelectorOpen(false)
            }
        }
        if (selectorOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [selectorOpen])

    useEffect(() => { setMobileMenuOpen(false) }, [pathname])

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    const handleSelectBank = (banco: Banco) => {
        setSelectedBank(banco.id, banco.nome, banco.cor)
        setSelectorOpen(false)
    }

    return (
        <div className="flex min-h-screen bg-[#030303] relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-grid opacity-50 animate-grid-move" />
                <div className="orb w-[500px] h-[500px] -top-48 -left-48 opacity-20" style={{ background: `rgba(${theme.primaryRGB}, 0.3)` }} />
                <div className="orb w-[400px] h-[400px] top-1/2 right-0 opacity-15 animate-pulse-glow" style={{ background: `rgba(${theme.primaryRGB}, 0.2)` }} />
            </div>

            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            <aside className={`w-[260px] glass-strong fixed h-full z-50 flex flex-col transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="p-5 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.4), rgba(${theme.primaryRGB}, 0.15))` }}>
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white tracking-tight">VS Trampos</h1>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.primary }}>Painel Gerente</p>
                        </div>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-3 mt-3 space-y-0.5 overflow-y-auto">
                    <p className="px-3 text-[9px] font-bold text-gray-700 uppercase tracking-[0.2em] mb-2">Menu</p>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/gerente' && pathname.startsWith(item.href))
                        const Icon = item.icon
                        return (
                            <Link key={item.href} href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 group relative overflow-hidden ${isActive ? 'text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/[0.03]'}`}
                                style={isActive ? { background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.25), rgba(${theme.primaryRGB}, 0.1))`, boxShadow: `0 4px 20px rgba(${theme.primaryRGB}, 0.15)`, borderLeft: `2px solid ${theme.primary}` } : {}}
                            >
                                <Icon size={17} className={isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-400'} />
                                {item.label}
                                {isActive && <div className="absolute right-3 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.primary }} />}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-3 border-t border-white/[0.04]">
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-gray-600 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all text-[13px] font-medium">
                        <LogOut size={17} /> Sair do Sistema
                    </button>
                </div>
            </aside>

            <main className="flex-1 lg:ml-[260px] min-h-screen relative z-10 w-full">
                <header className="sticky top-0 z-30 glass-strong px-4 lg:px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                                <Menu size={22} />
                            </button>
                            <div className="relative" ref={dropdownRef}>
                                <button onClick={() => setSelectorOpen(!selectorOpen)} className="bank-selector-glow flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-300 hover:bg-white/[0.03]" style={{ '--accent': theme.primaryRGB } as React.CSSProperties}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${theme.primaryRGB}, 0.15)` }}>
                                        <Landmark size={15} style={{ color: theme.primary }} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider hidden sm:block">Banco Ativo</p>
                                        <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[100px] sm:max-w-none">{selectedBankName || 'Selecionar'}</p>
                                    </div>
                                    <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${selectorOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {selectorOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 glass-strong rounded-2xl p-2 animate-fade-in-up shadow-2xl z-[100]">
                                        <p className="px-3 py-2 text-[9px] text-gray-600 font-bold uppercase tracking-wider">Escolha o banco</p>
                                        {bancos.map((banco) => (
                                            <button key={banco.id} onClick={() => handleSelectBank(banco)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${selectedBankId === banco.id ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}
                                            >
                                                <div className="w-3 h-3 rounded-full border border-white/10" style={{ background: banco.cor || '#7c3aed' }} />
                                                <span className="text-sm font-medium">{banco.nome}</span>
                                                {selectedBankId === banco.id && <Sparkles size={12} className="ml-auto" style={{ color: theme.primary }} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Gerente</p>
                                <p className="text-xs font-bold text-white">{userName}</p>
                            </div>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.3), rgba(${theme.primaryRGB}, 0.1))` }}>
                                G
                            </div>
                        </div>
                    </div>
                </header>

                <div className="animate-fade-in">{children}</div>
            </main>
        </div>
    )
}

export default function GerenteLayout({ children }: { children: React.ReactNode }) {
    return (
        <BankThemeProvider>
            <GerenteContent>{children}</GerenteContent>
        </BankThemeProvider>
    )
}
