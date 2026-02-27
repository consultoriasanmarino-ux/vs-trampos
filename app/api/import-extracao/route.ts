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

        // Validação de segurança: Verifica se o arquivo parece ser do formato correto
        // Se for só uma lista de CPFs, vai falhar aqui.
        if (lines.length > 0) {
            const sample = text.substring(0, 1000).toUpperCase()
            if (!sample.includes('BIN:') && !sample.includes('VAL:') && !sample.includes('NOME:')) {
                return NextResponse.json({
                    error: 'Formato inválido! Este campo aceita apenas arquivos de Log no formato completo (#N | BIN | VAL | NOME). Para importar apenas CPFs, use o campo da esquerda.'
                }, { status: 400 })
            }
        }

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

        // 1. Remover duplicados dentro do próprio arquivo enviado (caso o mesmo log tenha CPF repetido)
        const uniqueClientesMap = new Map()
        clientes.forEach(c => {
            // Se já existe e o novo tem nome/bin, substitui (prioriza dados completos)
            if (!uniqueClientesMap.has(c.cpf) || c.nome || c.bin_cartao) {
                uniqueClientesMap.set(c.cpf, c)
            }
        })
        const uniqueClientes = Array.from(uniqueClientesMap.values())

        // 2. Verificar quais CPFs já existem no banco de dados
        const allCpfs = uniqueClientes.map(c => c.cpf)
        let existingCpfs = new Set<string>()

        // Faz busca em lotes de 1000 para os CPFs existentes
        for (let i = 0; i < allCpfs.length; i += 1000) {
            const batchCpfs = allCpfs.slice(i, i + 1000)
            const { data: existingData } = await supabase
                .from('clientes')
                .select('cpf')
                .in('cpf', batchCpfs)

            if (existingData) {
                existingData.forEach(r => existingCpfs.add(r.cpf))
            }
        }

        const novos = uniqueClientes.filter(c => !existingCpfs.has(c.cpf))
        const repetidos = uniqueClientes.filter(c => existingCpfs.has(c.cpf))

        // 3. Executar o Upsert (ele vai inserir os novos e atualizar os antigos com o BIN/Validade)
        let totalProcessado = 0
        const batchSize = 500
        for (let i = 0; i < uniqueClientes.length; i += batchSize) {
            const chunk = uniqueClientes.slice(i, i + batchSize)
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
            atualizados: repetidos.length,
            erros: erros.length,
            message: `${novos.length} novos registros adicionados. ${repetidos.length} já existiam e foram atualizados com novos dados.${erros.length > 0 ? ` (${erros.length} linhas ignoradas por erro)` : ''}`,
        })
    } catch (err: any) {
        console.error('Erro no import-extracao:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message || 'desconhecido'}` }, { status: 500 })
    }
}
