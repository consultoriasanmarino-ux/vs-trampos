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

        // Parse formato: #N | BIN: XXXXXX | VAL: MM / YYYY | NOME: ... | 🆔 CPFXXXXXXX
        const clientes: any[] = []
        const erros: string[] = []

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            try {
                // Extrair BIN
                const binMatch = line.match(/BIN:\s*(\d+)/i)
                const bin = binMatch ? binMatch[1].trim() : null

                // Extrair Validade
                const valMatch = line.match(/VAL:\s*(\d{1,2}\s*\/\s*\d{4})/i)
                const validade = valMatch ? valMatch[1].replace(/\s/g, '') : null

                // Extrair Nome
                const nomeMatch = line.match(/NOME:\s*([^|🆔]+)/i)
                let nome = nomeMatch ? nomeMatch[1].trim() : null

                // Se o nome é "NOME_AUSENTE" ou muito curto (1-2 chars), ignora
                if (nome && (nome === 'NOME_AUSENTE' || nome.length <= 1)) {
                    nome = null
                }

                // Extrair CPF (vem após o emoji 🆔)
                const cpfMatch = line.match(/🆔\s*(\d{11})/i)
                if (!cpfMatch) {
                    // Tentar pegar qualquer sequência de 11 dígitos no final da linha
                    const cpfFallback = line.match(/(\d{11})\s*$/)
                    if (!cpfFallback) {
                        erros.push(`Linha ${i + 1}: CPF não encontrado`)
                        continue
                    }
                    var cpf = cpfFallback[1]
                } else {
                    var cpf = cpfMatch[1]
                }

                clientes.push({
                    cpf,
                    nome,
                    bin_cartao: bin,
                    validade_cartao: validade,
                    banco_principal_id: bancoId,
                })
            } catch (parseErr: any) {
                erros.push(`Linha ${i + 1}: ${parseErr.message}`)
            }
        }

        if (clientes.length === 0) {
            return NextResponse.json({
                error: `Nenhum registro válido encontrado. ${erros.length > 0 ? `Erros: ${erros.slice(0, 5).join('; ')}` : ''}`
            }, { status: 400 })
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
            erros: erros.length,
            message: `${totalInserido} registros importados com sucesso.${erros.length > 0 ? ` (${erros.length} linhas com erro)` : ''}`,
        })
    } catch (err: any) {
        console.error('Erro no import-extracao:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message || 'desconhecido'}` }, { status: 500 })
    }
}
