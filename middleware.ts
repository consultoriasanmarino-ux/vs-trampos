import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname
    const token = request.cookies.get('vs_token')?.value
    const role = request.cookies.get('vs_role')?.value

    // Rotas protegidas
    const isAdminRoute = path.startsWith('/admin')
    const isLigadorRoute = path.startsWith('/ligador')
    const isLoginRoute = path === '/login'

    // Se não tem token e está tentando acessar rota protegida → login
    if ((isAdminRoute || isLigadorRoute) && !token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(loginUrl)
    }

    // Se tem token e está na página de login → redireciona para o painel correto
    if (isLoginRoute && token) {
        if (role === 'admin') {
            return NextResponse.redirect(new URL('/admin', request.url))
        } else {
            return NextResponse.redirect(new URL('/ligador', request.url))
        }
    }

    // Se é ligador tentando acessar /admin → redireciona
    if (isAdminRoute && role === 'ligador') {
        return NextResponse.redirect(new URL('/ligador', request.url))
    }

    // Se é admin tentando acessar /ligador → permite (admin pode tudo)
    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/ligador/:path*', '/login'],
}
