import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        // Aceita 'leads' ou 'cpfs' para compatibilidade
        const leadsData = body.leads || body.cpfs
        const { whatsappOnly, enrichOnly, apiUrl, apiToken, apiModulo, apiWppUrl, apiWppToken } = body

        if (!leadsData || !Array.isArray(leadsData) || leadsData.length === 0) {
            return NextResponse.json({ error: 'Lista de leads/cpfs é obrigatória.' }, { status: 400 })
        }

        const url = apiUrl || 'https://completa.workbuscas.com/api?token={TOKEN}&modulo={MODULO}&consulta={PARAMETRO}'
        const token = apiToken || 'doavTXJphHLkpayfbdNdJyGp'
        const modulo = apiModulo || 'cpf'

        const resultados: { cpf: string; sucesso: boolean; dados?: any; erro?: string }[] = []

        for (const leadItem of leadsData) {
            const cpfLimpo = leadItem.cpf.replace(/\D/g, '')
            const clienteId = leadItem.id

            try {
                let novosDados: Record<string, any> = {}
                let sucessoGeral = false

                // 1. ENRIQUECIMENTO (Apenas se NÃO for whatsappOnly)
                if (!whatsappOnly) {
                    const finalUrl = url
                        .replace('{TOKEN}', token)
                        .replace('{MODULO}', modulo)
                        .replace('{PARAMETRO}', cpfLimpo)

                    console.log(`[API] Enriquecendo CPF ${cpfLimpo}...`)
                    const response = await fetch(finalUrl, {
                        method: 'GET',
                        cache: 'no-store',
                        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
                    })

                    if (response.ok) {
                        const result = await response.json()
                        const apiStatus = Number(result.status || result.Status || 0)

                        if (apiStatus === 200) {
                            const basicos = result?.DadosBasicos || result?.dadosBasicos || {}
                            const economicos = result?.DadosEconomicos || result?.dadosEconomicos || {}
                            const telefonesRaw = result?.telefones || result?.Telefones || []

                            const nome = basicos.nome || basicos.Nome || basicos.name || null

                            // Data Nasc
                            let rawDataNasc = basicos.dataNascimento || basicos.DataNascimento || null
                            let dataNasc = null
                            if (rawDataNasc) {
                                const match = String(rawDataNasc).match(/^(\d{2})[/-](\d{2})[/-](\d{4})/)
                                if (match) dataNasc = `${match[3]}-${match[2]}-${match[1]}`
                            }

                            // Renda e Score
                            const rendaRaw = economicos.renda || economicos.Renda || 0
                            const rendaNum = parseFloat(String(rendaRaw).replace(/\./g, '').replace(',', '.'))
                            const scoreVal = economicos.score?.scoreCSBA || economicos.score?.score || null

                            if (nome) novosDados.nome = nome
                            if (dataNasc) novosDados.data_nascimento = dataNasc
                            if (rendaNum) novosDados.renda = rendaNum
                            if (scoreVal) novosDados.score = Number(scoreVal)

                            // Telefones (se vier do enriquecimento e não tivermos ainda)
                            if (telefonesRaw.length > 0) {
                                const tels = telefonesRaw.map((t: any) => String(t.telefone || t).replace(/\D/g, '')).filter(Boolean)
                                if (tels.length > 0) novosDados.telefone = tels.join(', ')
                            }
                            sucessoGeral = true
                        }
                    }
                }

                // 2. VERIFICAÇÃO WHATSAPP (Se NÃO for enrichOnly OU se for whatsappOnly)
                if (!enrichOnly) {
                    // Pega os telefones (os que já existiam ou os novos do enriquecimento)
                    const telParaCheck = novosDados.telefone || leadItem.telefone

                    if (telParaCheck && apiWppToken && apiWppUrl) {
                        const listaTels = String(telParaCheck).replace(/[✅❌]/g, '').split(',').map(t => t.trim()).filter(Boolean)

                        if (listaTels.length > 0) {
                            const allTokens = String(apiWppToken).split(',').map(t => t.trim()).filter(t => !t.startsWith('[LIMITE'))
                            if (allTokens.length > 0) {
                                const currentToken = allTokens[0]
                                const telsComDdi = listaTels.map(t => t.length <= 11 ? `55${t}` : t)

                                const waRes = await fetch(apiWppUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                                    body: JSON.stringify({ blocking: true, contacts: telsComDdi })
                                })

                                if (waRes.ok) {
                                    const waData = await waRes.json()
                                    const contacts = waData.contacts || []

                                    const resultTels = listaTels.map(t => {
                                        const full = t.length <= 11 ? `55${t}` : t
                                        const match = contacts.find((c: any) => String(c.input || '').replace(/\D/g, '') === full || String(c.wa_id || '').split('@')[0] === full)
                                        const hasWa = match?.status?.includes('exist') || (match?.wa_id && match?.status !== 'non-existing')
                                        return `${t} ${hasWa ? '✅' : '❌'}`
                                    })
                                    novosDados.telefone = resultTels.join(', ')
                                    novosDados.wpp_checked = true
                                    sucessoGeral = true
                                }
                            }
                        }
                    }
                }

                // Salva se houve qualquer mudança
                if (Object.keys(novosDados).length > 0) {
                    await supabase.from('clientes').update(novosDados).eq('id', clienteId)
                    resultados.push({ cpf: cpfLimpo, sucesso: true, dados: novosDados })
                } else {
                    resultados.push({ cpf: cpfLimpo, sucesso: false, erro: 'Nenhum dado novo encontrado.' })
                }

            } catch (err: any) {
                resultados.push({ cpf: cpfLimpo, sucesso: false, erro: err.message })
            }
        }

        return NextResponse.json({ success: true, detalhes: resultados })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
