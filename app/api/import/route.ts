import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const banco = formData.get('banco') as string

        if (!file || !banco) {
            return NextResponse.json({ error: 'Arquivo e banco são obrigatórios' }, { status: 400 })
        }

        const text = await file.text()
        // Assume que cada linha é um CPF ou dados separados por vírgula/espaço
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)

        const clientes = lines.map(line => {
            const data = line.trim()
            return {
                cpf: data,
                banco: banco,
                created_at: new Date().toISOString()
            }
        })

        // Inserção em massa no Supabase
        const { data, error } = await supabase
            .from('clientes')
            .insert(clientes)
            .select()

        if (error) {
            console.error('Erro ao salvar no Supabase:', error)
            return NextResponse.json({ error: 'Erro ao salvar dados no banco' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: clientes.length,
            message: `${clientes.length} CPFs vinculados ao ${banco} foram importados com sucesso.`
        })

    } catch (error) {
        console.error('Erro no processamento do arquivo:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
