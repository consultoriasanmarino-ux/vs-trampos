'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Cores temáticas por banco
export const BANK_THEMES: Record<string, BankTheme> = {
    default: {
        name: 'Selecione um Banco',
        primary: '#7c3aed',
        primaryRGB: '124, 58, 237',
        gradient: 'from-violet-600 to-purple-700',
        glow: 'shadow-violet-600/30',
        bg: 'bg-violet-600',
        bgHover: 'hover:bg-violet-500',
        text: 'text-violet-500',
        textLight: 'text-violet-400',
        border: 'border-violet-500/20',
        ring: 'ring-violet-500/40',
    },
    itau: {
        name: 'Itaú',
        primary: '#FF6600',
        primaryRGB: '255, 102, 0',
        gradient: 'from-orange-500 to-amber-600',
        glow: 'shadow-orange-500/30',
        bg: 'bg-orange-500',
        bgHover: 'hover:bg-orange-400',
        text: 'text-orange-500',
        textLight: 'text-orange-400',
        border: 'border-orange-500/20',
        ring: 'ring-orange-500/40',
    },
    bradesco: {
        name: 'Bradesco',
        primary: '#CC092F',
        primaryRGB: '204, 9, 47',
        gradient: 'from-red-600 to-rose-700',
        glow: 'shadow-red-600/30',
        bg: 'bg-red-600',
        bgHover: 'hover:bg-red-500',
        text: 'text-red-500',
        textLight: 'text-red-400',
        border: 'border-red-500/20',
        ring: 'ring-red-500/40',
    },
    santander: {
        name: 'Santander',
        primary: '#EC0000',
        primaryRGB: '236, 0, 0',
        gradient: 'from-red-500 to-red-700',
        glow: 'shadow-red-500/30',
        bg: 'bg-red-500',
        bgHover: 'hover:bg-red-400',
        text: 'text-red-500',
        textLight: 'text-red-400',
        border: 'border-red-500/20',
        ring: 'ring-red-500/40',
    },
    'banco do brasil': {
        name: 'Banco do Brasil',
        primary: '#FFCC00',
        primaryRGB: '255, 204, 0',
        gradient: 'from-yellow-500 to-amber-500',
        glow: 'shadow-yellow-500/30',
        bg: 'bg-yellow-500',
        bgHover: 'hover:bg-yellow-400',
        text: 'text-yellow-500',
        textLight: 'text-yellow-400',
        border: 'border-yellow-500/20',
        ring: 'ring-yellow-500/40',
    },
    nubank: {
        name: 'Nubank',
        primary: '#8A05BE',
        primaryRGB: '138, 5, 190',
        gradient: 'from-purple-600 to-fuchsia-700',
        glow: 'shadow-purple-600/30',
        bg: 'bg-purple-600',
        bgHover: 'hover:bg-purple-500',
        text: 'text-purple-500',
        textLight: 'text-purple-400',
        border: 'border-purple-500/20',
        ring: 'ring-purple-500/40',
    },
    pan: {
        name: 'PAN',
        primary: '#0066CC',
        primaryRGB: '0, 102, 204',
        gradient: 'from-blue-600 to-blue-700',
        glow: 'shadow-blue-600/30',
        bg: 'bg-blue-600',
        bgHover: 'hover:bg-blue-500',
        text: 'text-blue-500',
        textLight: 'text-blue-400',
        border: 'border-blue-500/20',
        ring: 'ring-blue-500/40',
    },
    caixa: {
        name: 'Caixa',
        primary: '#005CA9',
        primaryRGB: '0, 92, 169',
        gradient: 'from-blue-700 to-cyan-700',
        glow: 'shadow-blue-700/30',
        bg: 'bg-blue-700',
        bgHover: 'hover:bg-blue-600',
        text: 'text-blue-600',
        textLight: 'text-blue-400',
        border: 'border-blue-600/20',
        ring: 'ring-blue-600/40',
    },
    bmg: {
        name: 'BMG',
        primary: '#FF8C00',
        primaryRGB: '255, 140, 0',
        gradient: 'from-orange-600 to-orange-700',
        glow: 'shadow-orange-600/30',
        bg: 'bg-orange-600',
        bgHover: 'hover:bg-orange-500',
        text: 'text-orange-600',
        textLight: 'text-orange-400',
        border: 'border-orange-600/20',
        ring: 'ring-orange-600/40',
    },
    c6: {
        name: 'C6 Bank',
        primary: '#1a1a1a',
        primaryRGB: '60, 60, 60',
        gradient: 'from-gray-700 to-gray-800',
        glow: 'shadow-gray-600/30',
        bg: 'bg-gray-700',
        bgHover: 'hover:bg-gray-600',
        text: 'text-gray-400',
        textLight: 'text-gray-300',
        border: 'border-gray-500/20',
        ring: 'ring-gray-500/40',
    },
    inter: {
        name: 'Inter',
        primary: '#FF7A00',
        primaryRGB: '255, 122, 0',
        gradient: 'from-orange-500 to-orange-600',
        glow: 'shadow-orange-500/30',
        bg: 'bg-orange-500',
        bgHover: 'hover:bg-orange-400',
        text: 'text-orange-500',
        textLight: 'text-orange-400',
        border: 'border-orange-500/20',
        ring: 'ring-orange-500/40',
    },
}

export interface BankTheme {
    name: string
    primary: string
    primaryRGB: string
    gradient: string
    glow: string
    bg: string
    bgHover: string
    text: string
    textLight: string
    border: string
    ring: string
}

// Detectar tema por nome do banco
export function getThemeForBank(bankName: string): BankTheme {
    const lower = bankName.toLowerCase().trim()

    // Checagem direta
    if (BANK_THEMES[lower]) return BANK_THEMES[lower]

    // Checagem parcial
    for (const [key, theme] of Object.entries(BANK_THEMES)) {
        if (lower.includes(key) || key.includes(lower)) return theme
    }

    // Fallback: gera cor baseada no nome
    return BANK_THEMES.default
}

interface BankContextType {
    selectedBankId: string | null
    selectedBankName: string | null
    theme: BankTheme
    setSelectedBank: (id: string | null, name: string | null) => void
}

const BankContext = createContext<BankContextType>({
    selectedBankId: null,
    selectedBankName: null,
    theme: BANK_THEMES.default,
    setSelectedBank: () => { },
})

export function BankThemeProvider({ children }: { children: ReactNode }) {
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null)
    const [selectedBankName, setSelectedBankName] = useState<string | null>(null)
    const [theme, setTheme] = useState<BankTheme>(BANK_THEMES.default)

    const setSelectedBank = (id: string | null, name: string | null) => {
        setSelectedBankId(id)
        setSelectedBankName(name)
        if (name) {
            setTheme(getThemeForBank(name))
        } else {
            setTheme(BANK_THEMES.default)
        }
    }

    return (
        <BankContext.Provider value={{ selectedBankId, selectedBankName, theme, setSelectedBank }}>
            {children}
        </BankContext.Provider>
    )
}

export const useBankTheme = () => useContext(BankContext)
