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

                console.log(`[API] Consultando CPF ${cpfLimpo}...`)

                const response = await fetch(finalUrl, {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    }
                })

                // Pega o texto bruto primeiro para evitar crash no .json()
                const rawText = await response.text()
                console.log(`[API] Status HTTP: ${response.status} | Resposta (100 chars): ${rawText.substring(0, 100)}`)

                // Se o HTTP retornou erro
                if (!response.ok) {
                    resultados.push({
                        cpf: cpfLimpo,
                        sucesso: false,
                        erro: `HTTP ${response.status}: ${rawText.substring(0, 150)}`
                    })
                    continue
                }

                // Tenta parsear o JSON
                let result: any
                try {
                    result = JSON.parse(rawText)
                } catch (parseError) {
                    resultados.push({
                        cpf: cpfLimpo,
                        sucesso: false,
                        erro: `Resposta não é JSON válido: ${rawText.substring(0, 100)}`
                    })
                    continue
                }

                console.log(`[API] JSON parsed OK. Status interno: ${result.status || result.Status || 'sem status'}`)

                // Aceitar qualquer variação de status 200
                const apiStatus = Number(result.status || result.Status || 0)

                if (apiStatus !== 200) {
                    const reason = result.reason || result.statusMsg || result.StatusMsg || result.message || JSON.stringify(result).substring(0, 100)
                    resultados.push({
                        cpf: cpfLimpo,
                        sucesso: false,
                        erro: `API status ${apiStatus}: ${reason}`
                    })
                    continue
                }

                // === EXTRAIR DADOS ===
                // Tenta múltiplas variações de nomes de campos
                const basicos = result.DadosBasicos || result.dadosBasicos || result.dados_basicos || {}
                const economicos = result.DadosEconomicos || result.dadosEconomicos || result.dados_economicos || {}
                const telefones = result.telefones || result.Telefones || result.phones || []

                // Nome
                const nome = basicos.nome || basicos.Nome || basicos.name || null

                // Data de nascimento - Converter DD/MM/YYYY para YYYY-MM-DD
                let rawDataNasc = basicos.dataNascimento || basicos.DataNascimento || basicos.data_nascimento || basicos.nascimento || null
                let dataNasc = null

                if (rawDataNasc) {
                    const dataStr = String(rawDataNasc).trim()
                    // Detecta formato DD/MM/YYYY
                    const match = dataStr.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/)
                    if (match) {
                        dataNasc = `${match[3]}-${match[2]}-${match[1]}`
                    } else {
                        dataNasc = dataStr // Mantém como está se já for ISO ou outro
                    }
                }

                console.log(`[API] CPF ${cpfLimpo} | Data Original: ${rawDataNasc} | Convertida: ${dataNasc}`)

                // Telefone - pega o primeiro disponível
                let telefone = null
                if (Array.isArray(telefones) && telefones.length > 0) {
                    const tel = telefones[0]
                    telefone = tel.telefone || tel.Telefone || tel.phone || tel.numero || (typeof tel === 'string' ? tel : null)
                }

                // Renda
                const rendaRaw = economicos.renda || economicos.Renda || economicos.income || ''
                let rendaNum: number | null = null
                if (rendaRaw) {
                    const rendaStr = String(rendaRaw)
                    rendaNum = parseFloat(rendaStr.replace(/\./g, '').replace(',', '.'))
                    if (isNaN(rendaNum)) rendaNum = null
                }

                // Score
                const scoreObj = economicos.score || economicos.Score || {}
                const scoreVal = scoreObj.scoreCSBA || scoreObj.scoreCSB || scoreObj.ScoreCSBA || scoreObj.score || null

                // Nome da mãe
                const nomeMae = basicos.nomeMae || basicos.NomeMae || basicos.nome_mae || null

                // Montar update
                const novosDados: Record<string, any> = {}
                if (nome) novosDados.nome = nome
                if (dataNasc) novosDados.data_nascimento = dataNasc
                if (rendaNum !== null) novosDados.renda = String(rendaNum)
                if (scoreVal) novosDados.score = String(scoreVal)
                if (telefone) {
                    novosDados.telefone = String(telefone)
                    novosDados.status_whatsapp = 'pendente'
                }
                // if (nomeMae) novosDados.nome_mae = nomeMae

                console.log(`[API] CPF ${cpfLimpo} => Dados extraídos:`, JSON.stringify(novosDados))

                if (Object.keys(novosDados).length === 0) {
                    resultados.push({
                        cpf: cpfLimpo,
                        sucesso: false,
                        erro: `API retornou status 200 mas nenhum campo útil. Keys na resposta: ${Object.keys(result).join(', ')}`
                    })
                    continue
                }

                // Atualizar no Supabase
                const { error: updateError } = await supabase
                    .from('clientes')
                    .update(novosDados)
                    .eq('id', clienteId)

                if (updateError) {
                    console.error(`[API] Erro Supabase para ${cpfLimpo}:`, updateError)
                    resultados.push({ cpf: cpfLimpo, sucesso: false, erro: `Supabase: ${updateError.message}` })
                } else {
                    console.log(`[API] ✅ CPF ${cpfLimpo} atualizado com sucesso!`)
                    resultados.push({ cpf: cpfLimpo, sucesso: true, dados: novosDados })
                }

            } catch (err: any) {
                console.error(`[API] ❌ Erro fatal para CPF ${cpfLimpo}:`, err)
                resultados.push({ cpf: cpfLimpo, sucesso: false, erro: `Erro de conexão: ${err.message}` })
            }

            // Delay entre consultas
            await new Promise(r => setTimeout(r, 500))
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
        console.error('Erro geral na rota de consulta:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message || 'desconhecido'}` }, { status: 500 })
    }
}
