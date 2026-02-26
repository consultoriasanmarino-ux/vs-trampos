'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import {
    LayoutDashboard,
    Landmark,
    Users,
    MessageCircle,
    LogOut,
    UserCog,
    ChevronDown,
    Sparkles,
    Zap,
    CreditCard
} from 'lucide-react'
import { supabase, Banco } from '@/lib/supabase'
import { BankThemeProvider, useBankTheme } from '@/lib/bank-theme'

const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/bancos', icon: Landmark, label: 'Bancos' },
    { href: '/admin/leads', icon: Users, label: 'Leads' },
    { href: '/admin/fichas', icon: CreditCard, label: 'Fichas' },
    { href: '/admin/ligadores', icon: UserCog, label: 'Ligadores' },
    { href: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
]

function AdminContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { theme, selectedBankId, selectedBankName, setSelectedBank } = useBankTheme()
    const [bancos, setBancos] = useState<Banco[]>([])
    const [selectorOpen, setSelectorOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const carregarBancos = async () => {
            const { data } = await supabase.from('bancos').select('*').order('nome')
            if (data && data.length > 0) {
                setBancos(data)

                // Se não tiver banco selecionado, tenta selecionar Nubank ou o primeiro
                if (!selectedBankId) {
                    const nubank = data.find(b => b.nome.toLowerCase().includes('nubank'))
                    if (nubank) {
                        setSelectedBank(nubank.id, nubank.nome, nubank.cor)
                    } else {
                        setSelectedBank(data[0].id, data[0].nome, data[0].cor)
                    }
                }
            } else if (data) {
                setBancos(data)
            }
        }
        carregarBancos()
    }, [selectedBankId])

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setSelectorOpen(false)
            }
        }
        if (selectorOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [selectorOpen])

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
            {/* ===== ANIMATED BACKGROUND ===== */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-grid opacity-50 animate-grid-move" />
                <div
                    className="orb w-[500px] h-[500px] -top-48 -left-48 opacity-20"
                    style={{ background: `rgba(${theme.primaryRGB}, 0.3)` }}
                />
                <div
                    className="orb w-[400px] h-[400px] top-1/2 right-0 opacity-15 animate-pulse-glow"
                    style={{ background: `rgba(${theme.primaryRGB}, 0.2)` }}
                />
                <div
                    className="orb w-[300px] h-[300px] bottom-0 left-1/3 opacity-10 animate-float-slow"
                    style={{ background: `rgba(${theme.primaryRGB}, 0.25)` }}
                />
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full animate-float"
                        style={{
                            width: `${4 + i * 2}px`,
                            height: `${4 + i * 2}px`,
                            background: `rgba(${theme.primaryRGB}, ${0.2 + i * 0.05})`,
                            top: `${15 + i * 14}%`,
                            left: `${10 + i * 15}%`,
                            animationDelay: `${i * 1.5}s`,
                            animationDuration: `${6 + i * 2}s`,
                        }}
                    />
                ))}
            </div>

            {/* ===== SIDEBAR ===== */}
            <aside className="w-[260px] glass-strong fixed h-full z-40 flex flex-col animate-slide-in-left">
                <div className="p-5 pb-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500"
                            style={{ background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.4), rgba(${theme.primaryRGB}, 0.15))` }}
                        >
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white tracking-tight">VS Trampos</h1>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] transition-colors duration-500" style={{ color: theme.primary }}>
                                {selectedBankName || 'CRM System'}
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 mt-3 space-y-0.5">
                    <p className="px-3 text-[9px] font-bold text-gray-700 uppercase tracking-[0.2em] mb-2">Menu</p>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 group relative overflow-hidden ${isActive
                                    ? 'text-white shadow-lg'
                                    : 'text-gray-500 hover:text-white hover:bg-white/[0.03]'
                                    }`}
                                style={isActive ? {
                                    background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.25), rgba(${theme.primaryRGB}, 0.1))`,
                                    boxShadow: `0 4px 20px rgba(${theme.primaryRGB}, 0.15)`,
                                    borderLeft: `2px solid ${theme.primary}`,
                                } : {}}
                            >
                                <Icon size={17} className={isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-400'} />
                                {item.label}
                                {isActive && (
                                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.primary }} />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-3 border-t border-white/[0.04]">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-gray-600 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all text-[13px] font-medium"
                    >
                        <LogOut size={17} />
                        Sair do Sistema
                    </button>
                </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 ml-[260px] min-h-screen relative z-10">
                {/* ===== TOP BAR WITH BANK SELECTOR ===== */}
                <header className="sticky top-0 z-50 glass-strong px-6 py-3">
                    <div className="flex items-center justify-between">
                        {/* Bank Selector */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setSelectorOpen(!selectorOpen)}
                                className="bank-selector-glow flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 hover:bg-white/[0.03]"
                                style={{ '--accent': theme.primaryRGB } as React.CSSProperties}
                            >
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500"
                                    style={{ background: `rgba(${theme.primaryRGB}, 0.15)` }}
                                >
                                    <Landmark size={15} style={{ color: theme.primary }} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Banco Ativo</p>
                                    <p className="text-sm font-bold text-white">{selectedBankName || 'Nenhum selecionado'}</p>
                                </div>
                                <ChevronDown
                                    size={14}
                                    className={`text-gray-500 transition-transform duration-300 ml-2 ${selectorOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {/* Dropdown */}
                            {selectorOpen && (
                                <div className="absolute top-full left-0 mt-2 w-72 glass-strong rounded-2xl p-2 animate-fade-in-up shadow-2xl z-[100]">
                                    <p className="px-3 py-2 text-[9px] text-gray-600 font-bold uppercase tracking-wider">
                                        Escolha o banco para trabalhar
                                    </p>
                                    {bancos.map((banco) => (
                                        <button
                                            key={banco.id}
                                            onClick={() => handleSelectBank(banco)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${selectedBankId === banco.id
                                                ? 'bg-white/[0.08] text-white'
                                                : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                                                }`}
                                        >
                                            <div className="w-3 h-3 rounded-full transition-all duration-300 border border-white/10" style={{
                                                background: banco.cor || '#7c3aed'
                                            }} />
                                            <span className="text-sm font-medium">{banco.nome}</span>
                                            {selectedBankId === banco.id && (
                                                <Sparkles size={12} className="ml-auto" style={{ color: theme.primary }} />
                                            )}
                                        </button>
                                    ))}
                                    {bancos.length === 0 && (
                                        <p className="px-3 py-4 text-xs text-gray-600 text-center">Nenhum banco cadastrado</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Admin</p>
                                <p className="text-xs font-bold text-white">osevenboy</p>
                            </div>
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all duration-500"
                                style={{ background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.3), rgba(${theme.primaryRGB}, 0.1))` }}
                            >
                                O
                            </div>
                        </div>
                    </div>
                </header>

                {/* ===== BANK SELECTION OVERLAY ===== */}
                {!selectedBankId && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in ml-[260px]">
                        <div className="glass-strong rounded-3xl p-8 max-w-md w-full mx-4 animate-fade-in-up text-center">
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
                                style={{ background: `linear-gradient(135deg, rgba(${theme.primaryRGB}, 0.3), rgba(${theme.primaryRGB}, 0.1))` }}
                            >
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Bem-vindo ao VS Trampos</h2>
                            <p className="text-sm text-gray-500 mb-6">Selecione um banco para começar a trabalhar.</p>
                            <div className="space-y-2">
                                {bancos.map((banco) => (
                                    <button
                                        key={banco.id}
                                        onClick={() => handleSelectBank(banco)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-gray-300 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 group"
                                    >
                                        <div className="w-4 h-4 rounded-full border border-white/10 shrink-0" style={{ background: banco.cor || '#7c3aed' }} />
                                        <span className="text-sm font-medium">{banco.nome}</span>
                                    </button>
                                ))}
                                {bancos.length === 0 && (
                                    <div className="py-6">
                                        <p className="text-gray-600 text-sm">Nenhum banco cadastrado ainda.</p>
                                        <Link href="/admin/bancos" className="text-violet-400 text-sm font-medium hover:underline mt-2 inline-block">
                                            Cadastrar primeiro banco →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Page Content */}
                <div className="animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <BankThemeProvider>
            <AdminContent>{children}</AdminContent>
        </BankThemeProvider>
    )
}
