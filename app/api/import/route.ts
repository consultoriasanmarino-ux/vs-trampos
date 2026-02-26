import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const bancoId = formData.get('banco_id') as string

        if (!file || !bancoId) {
            return NextResponse.json({ error: 'Arquivo e banco são obrigatórios.' }, { status: 400 })
        }

        const text = await file.text()
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)

        // Limpa CPFs (remove pontos, traços, espaços)
        const clientes = lines
            .map(line => {
                const cpfLimpo = line.trim().replace(/[.\-\s]/g, '')
                // Só aceita se parecer um CPF (11 dígitos numéricos)
                if (/^\d{11}$/.test(cpfLimpo)) {
                    return {
                        cpf: cpfLimpo,
                        banco_principal_id: bancoId,
                    }
                }
                return null
            })
            .filter(Boolean)

        if (clientes.length === 0) {
            return NextResponse.json({ error: 'Arquivo vazio ou sem CPFs válidos (11 dígitos).' }, { status: 400 })
        }

        // Inserção em lotes de 500 para evitar timeout
        let totalInserido = 0
        const batch = 500
        for (let i = 0; i < clientes.length; i += batch) {
            const chunk = clientes.slice(i, i + batch)
            const { error } = await supabase
                .from('clientes')
                .upsert(chunk, { onConflict: 'cpf' })

            if (error) {
                console.error('Erro Supabase:', error)
                return NextResponse.json({
                    error: `Erro no banco: ${error.message}. Inseridos até agora: ${totalInserido}`,
                }, { status: 500 })
            }
            totalInserido += chunk.length
        }

        return NextResponse.json({
            success: true,
            count: totalInserido,
            message: `${totalInserido} CPFs importados com sucesso.`,
        })
    } catch (err: any) {
        console.error('Erro no import:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message || 'desconhecido'}` }, { status: 500 })
    }
}
