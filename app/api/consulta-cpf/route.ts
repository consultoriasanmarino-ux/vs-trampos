import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { cpfs, apiUrl, apiToken, apiModulo } = body

        if (!cpfs || !Array.isArray(cpfs) || cpfs.length === 0) {
            return NextResponse.json({ error: 'Lista de CPFs é obrigatória.' }, { status: 400 })
        }

        const url = apiUrl || 'https://completa.workbuscas.com/api?token={TOKEN}&modulo={MODULO}&consulta={PARAMETRO}'
        const token = apiToken || 'doavTXJphHLkpayfbdNdJyGp'
        const modulo = apiModulo || 'cpf'

        const resultados: { cpf: string; sucesso: boolean; dados?: any; erro?: string }[] = []

        for (const cpfItem of cpfs) {
            const cpfLimpo = cpfItem.cpf.replace(/\D/g, '')
            const clienteId = cpfItem.id

            try {
                const finalUrl = url
                    .replace('{TOKEN}', token)
                    .replace('{MODULO}', modulo)
                    .replace('{PARAMETRO}', cpfLimpo)

                const response = await fetch(finalUrl)
                const result = await response.json()

                if (result && result.status === 200) {
                    const basicos = result.DadosBasicos || {}
                    const economicos = result.DadosEconomicos || {}
                    const telefones = result.telefones || []

                    // Primeiro telefone válido
                    const telefone = telefones.length > 0 ? telefones[0].telefone : null

                    // Converter renda "891,66" para número
                    const rendaStr = economicos.renda || ''
                    const rendaNum = rendaStr ? parseFloat(rendaStr.replace(/\./g, '').replace(',', '.')) : null

                    // Score
                    const scoreObj = economicos.score || {}
                    const scoreVal = scoreObj.scoreCSBA || scoreObj.scoreCSB || null

                    // Montar dados para atualizar
                    const novosDados: Record<string, any> = {}
                    if (basicos.nome) novosDados.nome = basicos.nome
                    if (basicos.dataNascimento) novosDados.data_nascimento = basicos.dataNascimento
                    if (rendaNum) novosDados.renda = String(rendaNum)
                    if (scoreVal) novosDados.score = String(scoreVal)
                    if (telefone) novosDados.telefone = telefone
                    if (basicos.nomeMae) novosDados.nome_mae = basicos.nomeMae

                    if (Object.keys(novosDados).length > 0) {
                        const { error: updateError } = await supabase
                            .from('clientes')
                            .update(novosDados)
                            .eq('id', clienteId)

                        if (updateError) {
                            resultados.push({ cpf: cpfLimpo, sucesso: false, erro: updateError.message })
                        } else {
                            resultados.push({ cpf: cpfLimpo, sucesso: true, dados: novosDados })
                        }
                    } else {
                        resultados.push({ cpf: cpfLimpo, sucesso: false, erro: 'API retornou dados mas nenhum campo útil encontrado' })
                    }
                } else {
                    resultados.push({
                        cpf: cpfLimpo,
                        sucesso: false,
                        erro: `API status ${result?.status}: ${result?.reason || result?.statusMsg || 'erro desconhecido'}`
                    })
                }
            } catch (err: any) {
                resultados.push({ cpf: cpfLimpo, sucesso: false, erro: err.message })
            }

            // Delay entre consultas para não sobrecarregar a API
            await new Promise(r => setTimeout(r, 400))
        }

        const sucessos = resultados.filter(r => r.sucesso).length
        const erros = resultados.filter(r => !r.sucesso)

        return NextResponse.json({
            success: true,
            total: cpfs.length,
            sucessos,
            erros: erros.length,
            detalhes: resultados
        })
    } catch (err: any) {
        console.error('Erro na consulta de CPFs:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message || 'desconhecido'}` }, { status: 500 })
    }
}
