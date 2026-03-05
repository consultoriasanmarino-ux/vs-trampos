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

                            // 🔎 EXTRAÇÃO ULTRA-ROBUSTA DE LOCALIZAÇÃO
                            let estado = null
                            let cidade = null
                            let logradouro = null

                            // 1. Tentar pegar de objetos "Endereco" (singular)
                            const objEnd = result?.Endereco || result?.endereco || result?.DadosBasicos?.endereco || result?.DadosBasicos?.Endereco || {}

                            // 2. Tentar pegar de listas "Enderecos" (plural - MUITO COMUM)
                            const listaEnd = result?.Enderecos || result?.enderecos || result?.DadosBasicos?.enderecos || []
                            const firstEnd = (Array.isArray(listaEnd) && listaEnd.length > 0) ? listaEnd[0] : {}

                            // 3. Tentar pegar de "DadosBasicos" diretamente
                            const bas = result?.DadosBasicos || result?.dadosBasicos || {}

                            // --- BUSCA PELO ESTADO (UF) ---
                            estado = firstEnd.uf || firstEnd.UF || firstEnd.estado ||
                                objEnd.uf || objEnd.UF || objEnd.estado ||
                                bas.uf || bas.UF || bas.estado || bas.naturalidade_uf ||
                                result.uf || result.UF || null

                            // --- BUSCA PELA CIDADE ---
                            cidade = firstEnd.cidade || firstEnd.Cidade || firstEnd.municipio || firstEnd.Municipio ||
                                objEnd.cidade || objEnd.Cidade || objEnd.municipio ||
                                bas.cidade || bas.Cidade || bas.municipio || bas.naturalidade_municipio ||
                                result.cidade || result.municipio || null

                            // --- BUSCA PELO LOGRADOURO ---
                            logradouro = firstEnd.logradouro || firstEnd.Logradouro || firstEnd.endereco ||
                                objEnd.logradouro || objEnd.Logradouro || objEnd.endereco ||
                                bas.endereco || bas.logradouro || null

                            if (estado) novosDados.estado = String(estado).toUpperCase().trim().substring(0, 2)
                            if (cidade) novosDados.cidade = String(cidade).trim()
                            if (logradouro) novosDados.endereco = String(logradouro).trim()

                            console.log(`[API] CPF ${cpfLimpo} Extraído -> UF: ${novosDados.estado}, CID: ${novosDados.cidade}`)

                            // Telefones
                            const tRaw = result?.telefones || result?.Telefones || result?.Telefone || []
                            if (tRaw && (Array.isArray(tRaw) || typeof tRaw === 'string')) {
                                const rawArray = Array.isArray(tRaw) ? tRaw : [tRaw]
                                const tels = rawArray.map((t: any) => {
                                    const value = typeof t === 'object' ? (t.telefone || t.Telefone || t.numero || t.Numero || '') : t
                                    return String(value).replace(/\D/g, '')
                                }).filter(Boolean)
                                if (tels.length > 0) novosDados.telefone = tels.join(', ')
                            }
                            sucessoGeral = true
                        } else {
                            console.log(`[API] CPF ${cpfLimpo} retornou status ${apiStatus}`)
                        }
                    } else {
                        console.log(`[API] Erro na resposta da API para ${cpfLimpo}: ${response.status}`)
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
