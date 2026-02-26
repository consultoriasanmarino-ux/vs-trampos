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
        const clientes = lines.map(line => {
            const cpfLimpo = line.trim().replace(/[.\-\s]/g, '')
            return {
                cpf: cpfLimpo,
                banco_principal_id: bancoId,
                status_whatsapp: null,
                created_at: new Date().toISOString(),
            }
        })

        if (clientes.length === 0) {
            return NextResponse.json({ error: 'Arquivo vazio ou sem CPFs válidos.' }, { status: 400 })
        }

        // Inserção em lote (upsert por CPF para evitar duplicatas)
        const { data, error } = await supabase
            .from('clientes')
            .upsert(clientes, { onConflict: 'cpf' })
            .select()

        if (error) {
            console.error('Erro Supabase:', error)
            return NextResponse.json({ error: 'Erro ao salvar no banco de dados.' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: clientes.length,
            message: `${clientes.length} CPFs importados com sucesso.`,
        })
    } catch (err) {
        console.error('Erro no import:', err)
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
    }
}
