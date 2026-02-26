import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ADMIN_USER = 'osevenboy'
const ADMIN_PASS = 'Neneco24!'

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json()

        if (!username || !password) {
            return NextResponse.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 })
        }

        // Verifica se é o admin
        if (username === ADMIN_USER && password === ADMIN_PASS) {
            const response = NextResponse.json({ success: true, role: 'admin', nome: 'Admin' })
            response.cookies.set('vs_token', 'admin_session_' + Date.now(), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24, // 24h
                path: '/',
            })
            response.cookies.set('vs_role', 'admin', {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24,
                path: '/',
            })
            response.cookies.set('vs_user_id', 'admin', {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24,
                path: '/',
            })
            return response
        }

        // Verifica se é um ligador
        const { data: ligador, error } = await supabase
            .from('ligadores')
            .select('*')
            .eq('login', username)
            .single()

        if (error || !ligador) {
            return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
        }

        // Comparação simples de senha (em produção, usar bcrypt)
        if (ligador.senha_hash !== password) {
            return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
        }

        const response = NextResponse.json({ success: true, role: 'ligador', nome: ligador.nome })
        response.cookies.set('vs_token', 'ligador_session_' + Date.now(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        })
        response.cookies.set('vs_role', 'ligador', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        })
        response.cookies.set('vs_user_id', ligador.id, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        })

        return response
    } catch {
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
    }
}
