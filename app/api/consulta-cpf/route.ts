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

                console.log(`[Proxy API] Consultando CPF: ${cpfLimpo} na URL: ${finalUrl.replace(token, '***')}`)

                const response = await fetch(finalUrl, { cache: 'no-store' })
                const result = await response.json()

                console.log(`[Proxy API] Resposta para ${cpfLimpo}:`, JSON.stringify(result).substring(0, 200))

                // Verifica status 200 (numérico ou string)
                if (result && (result.status == 200 || result.status == "200" || result.Status == 200)) {
                    const basicos = result.DadosBasicos || {}
                    const economicos = result.DadosEconomicos || {}
                    const telefones = result.telefones || result.Telefones || []

                    // Primeiro telefone válido
                    const telefone = telefones.length > 0 ? (telefones[0].telefone || telefones[0].Telefone) : null

                    // Converter renda "891,66" para número
                    const rendaStr = String(economicos.renda || economicos.Renda || '')
                    const rendaNum = rendaStr ? parseFloat(rendaStr.replace(/\./g, '').replace(',', '.')) : null

                    // Score
                    const scoreObj = economicos.score || economicos.Score || {}
                    const scoreVal = scoreObj.scoreCSBA || scoreObj.scoreCSB || scoreObj.ScoreCSBA || null

                    // Montar dados para atualizar
                    const novosDados: Record<string, any> = {}
                    if (basicos.nome || basicos.Nome) novosDados.nome = basicos.nome || basicos.Nome
                    if (basicos.dataNascimento || basicos.DataNascimento) novosDados.data_nascimento = basicos.dataNascimento || basicos.DataNascimento
                    if (rendaNum) novosDados.renda = String(rendaNum)
                    if (scoreVal) novosDados.score = String(scoreVal)
                    if (telefone) novosDados.telefone = telefone
                    if (basicos.nomeMae || basicos.NomeMae) novosDados.nome_mae = basicos.nomeMae || basicos.NomeMae

                    if (Object.keys(novosDados).length > 0) {
                        const { error: updateError } = await supabase
                            .from('clientes')
                            .update(novosDados)
                            .eq('id', clienteId)

                        if (updateError) {
                            console.error(`[Proxy API] Erro ao atualizar Supabase para ${cpfLimpo}:`, updateError)
                            resultados.push({ cpf: cpfLimpo, sucesso: false, erro: updateError.message })
                        } else {
                            resultados.push({ cpf: cpfLimpo, sucesso: true, dados: novosDados })
                        }
                    } else {
                        resultados.push({ cpf: cpfLimpo, sucesso: false, erro: 'API retornou dados mas nenhum campo útil encontrado' })
                    }
                } else {
                    const erroMsg = result?.reason || result?.statusMsg || result?.StatusMsg || 'erro desconhecido'
                    console.warn(`[Proxy API] Falha na consulta ${cpfLimpo}: Status ${result?.status} - ${erroMsg}`)
                    resultados.push({
                        cpf: cpfLimpo,
                        sucesso: false,
                        erro: `API status ${result?.status}: ${erroMsg}`
                    })
                }
            } catch (err: any) {
                console.error(`[Proxy API] Erro fatal na consulta ${cpfItem.cpf}:`, err)
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
