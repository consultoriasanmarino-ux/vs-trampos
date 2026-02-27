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

        // Limpa CPFs (remove pontos, traços, espaços) e remove duplicados dentro do arquivo
        const uniqueCpfsMap = new Map()
        lines.forEach(line => {
            const cpfLimpo = line.trim().replace(/[.\-\s]/g, '')
            // Só aceita se parecer um CPF (11 dígitos numéricos)
            if (/^\d{11}$/.test(cpfLimpo)) {
                uniqueCpfsMap.set(cpfLimpo, {
                    cpf: cpfLimpo,
                    banco_principal_id: bancoId,
                })
            }
        })

        const uniqueClientes = Array.from(uniqueCpfsMap.values())

        if (uniqueClientes.length === 0) {
            return NextResponse.json({ error: 'Arquivo vazio ou sem CPFs válidos (11 dígitos).' }, { status: 400 })
        }

        // Verificar quais CPFs já existem para dar um relatório preciso
        const allCpfs = uniqueClientes.map(c => c.cpf)
        const batchCheck = 1000
        const existingCpfs = new Set<string>()

        for (let i = 0; i < allCpfs.length; i += batchCheck) {
            const batch = allCpfs.slice(i, i + batchCheck)
            const { data } = await supabase.from('clientes').select('cpf').in('cpf', batch)
            if (data) data.forEach(r => existingCpfs.add(r.cpf))
        }

        const novos = uniqueClientes.filter(c => !existingCpfs.has(c.cpf))

        // Inserção em lotes de 500 para evitar timeout
        let totalProcessado = 0
        const batch = 500
        for (let i = 0; i < uniqueClientes.length; i += batch) {
            const chunk = uniqueClientes.slice(i, i + batch)
            const { error } = await supabase
                .from('clientes')
                .upsert(chunk, { onConflict: 'cpf' })

            if (error) {
                console.error('Erro Supabase:', error)
                return NextResponse.json({
                    error: `Erro no banco: ${error.message}. Processados: ${totalProcessado}`,
                }, { status: 500 })
            }
            totalProcessado += chunk.length
        }

        return NextResponse.json({
            success: true,
            total: uniqueClientes.length,
            novos: novos.length,
            atualizados: uniqueClientes.length - novos.length,
            message: `${novos.length} novos CPFs importados. ${uniqueClientes.length - novos.length} já existiam no banco.`,
        })
    } catch (err: any) {
        console.error('Erro no import:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message || 'desconhecido'}` }, { status: 500 })
    }
}
