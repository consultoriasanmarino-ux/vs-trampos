'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Paleta de cores pré-definidas para o usuário escolher
export const COLOR_PALETTE = [
    { name: 'Laranja', hex: '#FF6600' },
    { name: 'Vermelho', hex: '#CC092F' },
    { name: 'Vermelho vivo', hex: '#EC0000' },
    { name: 'Amarelo', hex: '#F5A623' },
    { name: 'Dourado', hex: '#DAA520' },
    { name: 'Verde', hex: '#00A859' },
    { name: 'Verde escuro', hex: '#0D7C3A' },
    { name: 'Azul', hex: '#0066CC' },
    { name: 'Azul escuro', hex: '#005CA9' },
    { name: 'Azul claro', hex: '#2196F3' },
    { name: 'Roxo', hex: '#7c3aed' },
    { name: 'Roxo vivo', hex: '#8A05BE' },
    { name: 'Rosa', hex: '#E91E63' },
    { name: 'Ciano', hex: '#00BCD4' },
    { name: 'Cinza', hex: '#607D8B' },
]

export interface BankTheme {
    primary: string
    primaryRGB: string
}

// Converter hex para RGB
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result) {
        return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    }
    return '124, 58, 237' // fallback violet
}

const DEFAULT_THEME: BankTheme = {
    primary: '#7c3aed',
    primaryRGB: '124, 58, 237',
}

// Gerar tema a partir de uma cor hex
export function themeFromColor(hex: string | null): BankTheme {
    if (!hex) return DEFAULT_THEME
    return {
        primary: hex,
        primaryRGB: hexToRgb(hex),
    }
}

interface BankContextType {
    selectedBankId: string | null
    selectedBankName: string | null
    theme: BankTheme
    setSelectedBank: (id: string | null, name: string | null, color: string | null) => void
}

const BankContext = createContext<BankContextType>({
    selectedBankId: null,
    selectedBankName: null,
    theme: DEFAULT_THEME,
    setSelectedBank: () => { },
})

export function BankThemeProvider({ children }: { children: ReactNode }) {
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null)
    const [selectedBankName, setSelectedBankName] = useState<string | null>(null)
    const [theme, setTheme] = useState<BankTheme>(DEFAULT_THEME)

    const setSelectedBank = (id: string | null, name: string | null, color: string | null) => {
        setSelectedBankId(id)
        setSelectedBankName(name)
        setTheme(color ? themeFromColor(color) : DEFAULT_THEME)
    }

    return (
        <BankContext.Provider value={{ selectedBankId, selectedBankName, theme, setSelectedBank }}>
            {children}
        </BankContext.Provider>
    )
}

export const useBankTheme = () => useContext(BankContext)
