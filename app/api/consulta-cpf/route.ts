import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { cpfs, apiUrl, apiToken, apiModulo, apiWppUrl, apiWppToken } = body

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

                let result: any = null
                const jaTinhaTelefone = !!cpfItem.telefone

                // SÓ CONSULTA ENRIQUECIMENTO SE NÃO TIVER TELEFONE OU NOME
                if (!cpfItem.nome || !jaTinhaTelefone) {
                    console.log(`[API] Enriquecendo CPF ${cpfLimpo}...`)
                    const response = await fetch(finalUrl, {
                        method: 'GET',
                        cache: 'no-store',
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0'
                        }
                    })

                    const rawText = await response.text()

                    if (response.ok) {
                        try {
                            result = JSON.parse(rawText)
                        } catch (e) {
                            console.error('Erro parse JSON enriquecimento')
                        }
                    }
                } else {
                    console.log(`[API] CPF ${cpfLimpo} já tem dados, pulando enriquecimento.`)
                }

                // Aceitar qualquer variação de status 200 ou se já tivermos dados
                const apiStatus = result ? Number(result.status || result.Status || 0) : 200

                if (apiStatus !== 200 && !jaTinhaTelefone) {
                    const reason = result?.reason || result?.statusMsg || result?.StatusMsg || result?.message || 'Erro na API'

                    // Excluir lead se der erro na consulta e NÃO tivermos nada dele ainda
                    await supabase.from('clientes').delete().eq('id', clienteId)

                    resultados.push({
                        cpf: cpfLimpo,
                        sucesso: false,
                        erro: `API status ${apiStatus}: ${reason} (Lead excluído)`
                    })
                    continue
                }

                // === EXTRAIR DADOS ===
                const basicos = result?.DadosBasicos || result?.dadosBasicos || result?.dados_basicos || {}
                const economicos = result?.DadosEconomicos || result?.dadosEconomicos || result?.dados_economicos || {}
                const telefonesRaw = result?.telefones || result?.Telefones || result?.phones || []

                // Se não veio dado novo mas já tinha telefone, mantém o que tinha
                const nome = basicos.nome || basicos.Nome || basicos.name || cpfItem.nome || null

                // Data de nascimento
                let rawDataNasc = basicos.dataNascimento || basicos.DataNascimento || basicos.data_nascimento || basicos.nascimento || null
                let dataNasc = null

                if (rawDataNasc) {
                    const dataStr = String(rawDataNasc).trim()
                    const match = dataStr.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/)
                    if (match) dataNasc = `${match[3]}-${match[2]}-${match[1]}`
                    else dataNasc = dataStr
                }

                // Telefones - Pega, limpa e expande para lidar com o 9º dígito no Brasil
                let listaTels: string[] = []
                const sourceRaw = (Array.isArray(telefonesRaw) && telefonesRaw.length > 0)
                    ? telefonesRaw
                    : (cpfItem.telefone ? cpfItem.telefone.split(',') : [])

                if (sourceRaw.length > 0) {
                    const rawNumbers = sourceRaw.map((t: any) => {
                        const val = t.telefone || t.Telefone || t.phone || t.numero || (typeof t === 'string' ? t : null)
                        return val ? String(val).replace(/\D/g, '') : null
                    }).filter(Boolean) as string[]

                    const expanded = new Set<string>()
                    rawNumbers.forEach(t => {
                        expanded.add(t)
                        // Se for Brasil (DDD 11-99)
                        if (t.length === 11) {
                            const ddd = t.substring(0, 2)
                            const nove = t.substring(2, 3)
                            const resto = t.substring(3)
                            if (nove === '9') {
                                // Adiciona versão sem o 9 (ID antigo)
                                expanded.add(`${ddd}${resto}`)
                            }
                        } else if (t.length === 10) {
                            // Adiciona versão COM o 9 (ID novo)
                            const ddd = t.substring(0, 2)
                            const resto = t.substring(2)
                            expanded.add(`${ddd}9${resto}`)
                        }
                    })
                    listaTels = Array.from(expanded)
                }

                // === VERIFICAR WHATSAPP VIA API EXTERNA ===
                let telefoneComStatus = ''
                if (listaTels.length > 0) {
                    const delsFinal: string[] = []
                    // Guardamos os resultados por número base (sem DDI) para facilitar o merge depois
                    const resultsInterno: Record<string, boolean> = {}

                    // Se tiver Tokens do Checker configurados (rotação)
                    if (apiWppToken && apiWppUrl) {
                        const tokens = String(apiWppToken).split(',').map(t => t.trim()).filter(Boolean)

                        // Tenta cada token até um funcionar
                        for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
                            const currentToken = tokens[tokenIdx]
                            try {
                                const telsComDdi = listaTels.map(t => t.length <= 11 ? `55${t}` : t)

                                console.log(`[WA] Verificando via Whapi (Token ${tokenIdx + 1}/${tokens.length})...`)

                                const waRes = await fetch(apiWppUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${currentToken}`
                                    },
                                    body: JSON.stringify({
                                        blocking: true,
                                        contacts: telsComDdi
                                    })
                                })

                                // Se bater limite (403) ou erro de auth (401), tenta o próximo token
                                if (waRes.status === 403 || waRes.status === 401 || waRes.status === 429) {
                                    console.warn(`[WA] Token ${tokenIdx + 1} falhou (Status ${waRes.status}). Tentando próximo...`)
                                    continue
                                }

                                const waData = await waRes.json()
                                const contacts = waData.contacts || []

                                console.log(`[WA] API retornou ${contacts.length} contatos.`)

                                // Mapeia quais números tem WhatsApp
                                listaTels.forEach(t => {
                                    const full = t.length <= 11 ? `55${t}` : t
                                    const match = contacts.find((c: any) => {
                                        const inputClean = String(c.input || '').replace(/\D/g, '')
                                        const waIdClean = String(c.wa_id || '').split('@')[0].replace(/\D/g, '')
                                        return inputClean === full || waIdClean === full
                                    })

                                    const hasWa = match?.status?.includes('exist') || (match?.wa_id && match?.status !== 'non-existing')
                                    resultsInterno[t] = !!hasWa
                                    if (hasWa) console.log(`[WA] Confirmado: ${t} (Status: ${match?.status})`)
                                })

                                // Se chegou aqui com sucesso, não precisa testar outros tokens para este lote
                                break
                            } catch (waErr) {
                                console.error(`[WA] Erro com token ${tokenIdx + 1}:`, waErr)
                                // Continua tentando se houver mais tokens
                            }
                        }
                    }

                    // Agora que temos os resultados das variações, remontamos a lista original do lead
                    // mas marcamos ✅ se QUALQUER variação (com ou sem 9) deu certo.
                    const telsLeadOriginal = Array.from(new Set(telefonesRaw.map((t: any) => {
                        const val = t.telefone || t.Telefone || t.phone || t.numero || (typeof t === 'string' ? t : null)
                        return val ? String(val).replace(/\D/g, '') : null
                    }).filter(Boolean))) as string[]

                    telsLeadOriginal.forEach(t => {
                        let hasWa = resultsInterno[t] || false

                        // Tenta as duas versões para garantir o ✅
                        if (!hasWa) {
                            const semNove = (t.length === 11 && t.charAt(2) === '9') ? `${t.substring(0, 2)}${t.substring(3)}` : null
                            const comNove = (t.length === 10) ? `${t.substring(0, 2)}9${t.substring(2)}` : null

                            if (semNove && resultsInterno[semNove]) hasWa = true
                            else if (comNove && resultsInterno[comNove]) hasWa = true
                        }

                        delsFinal.push(`${t} ${hasWa ? '✅' : '❌'}`)
                    })

                    telefoneComStatus = delsFinal.join(', ')
                }

                // Renda
                const economicosData = result?.DadosEconomicos || result?.dadosEconomicos || result?.dados_economicos || {}
                const rendaRaw = economicosData.renda || economicosData.Renda || economicosData.income || ''
                let rendaNum: number | null = null
                if (rendaRaw) {
                    rendaNum = parseFloat(String(rendaRaw).replace(/\./g, '').replace(',', '.'))
                }

                // Score
                const scoreObj = economicosData.score || economicosData.Score || {}
                const scoreVal = scoreObj.scoreCSBA || scoreObj.scoreCSB || scoreObj.score || null

                // Montar update
                const novosDados: Record<string, any> = {
                    wpp_checked: true // Sempre marca como verificado após esse processo
                }
                if (nome) novosDados.nome = nome
                if (dataNasc) novosDados.data_nascimento = dataNasc
                if (rendaNum && !isNaN(rendaNum)) novosDados.renda = rendaNum
                if (scoreVal) novosDados.score = Number(scoreVal)
                if (telefoneComStatus) {
                    novosDados.telefone = telefoneComStatus
                }

                if (!telefoneComStatus && !jaTinhaTelefone && !nome) {
                    await supabase.from('clientes').delete().eq('id', clienteId)
                    resultados.push({ cpf: cpfLimpo, sucesso: false, erro: `Sem dados úteis. (Excluído)` })
                    continue
                }

                const { error: updateError } = await supabase.from('clientes').update(novosDados).eq('id', clienteId)

                if (updateError) {
                    resultados.push({ cpf: cpfLimpo, sucesso: false, erro: updateError.message })
                } else {
                    resultados.push({ cpf: cpfLimpo, sucesso: true, dados: novosDados })
                }

            } catch (err: any) {
                resultados.push({ cpf: cpfLimpo, sucesso: false, erro: err.message })
            }

            // Delay entre consultas
            await new Promise(r => setTimeout(r, 500))
        }

        const sucessos = resultados.filter(r => r.sucesso).length
        const excluidos = resultados.filter(r => r.erro && r.erro.includes('Excluído')).length
        const errosList = resultados.filter(r => !r.sucesso && !r.erro?.includes('Excluído'))

        return NextResponse.json({
            success: true,
            total: cpfs.length,
            sucessos,
            excluidos,
            erros: errosList.length,
            detalhes: resultados
        })
    } catch (err: any) {
        console.error('Erro geral na rota de consulta:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message || 'desconhecido'}` }, { status: 500 })
    }
}
