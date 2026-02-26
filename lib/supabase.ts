import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos do banco de dados
export interface Banco {
    id: string
    nome: string
    cor: string | null
    created_at: string
}

export interface Cliente {
    id: string
    cpf: string
    nome: string | null
    data_nascimento: string | null
    renda: number | null
    score: number | null
    banco_principal_id: string | null
    status_whatsapp: 'ativo' | 'fixo' | 'invalido' | null
    telefone: string | null
    atribuido_a: string | null
    created_at: string
    bancos?: Banco
}

export interface Ligador {
    id: string
    nome: string
    login: string
    senha_hash: string
    created_at: string
}
