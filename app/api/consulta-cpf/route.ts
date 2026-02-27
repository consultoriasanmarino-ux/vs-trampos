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
                        erro: `Resposta não é JSON válido`
                    })
                    continue
                }

                // Aceitar qualquer variação de status 200
                const apiStatus = Number(result.status || result.Status || 0)

                if (apiStatus !== 200) {
                    const reason = result.reason || result.statusMsg || result.StatusMsg || result.message || 'Erro na API'

                    // Excluir lead se der erro na consulta
                    await supabase.from('clientes').delete().eq('id', clienteId)

                    resultados.push({
                        cpf: cpfLimpo,
                        sucesso: false,
                        erro: `API status ${apiStatus}: ${reason} (Lead excluído)`
                    })
                    continue
                }

                // === EXTRAIR DADOS ===
                const basicos = result.DadosBasicos || result.dadosBasicos || result.dados_basicos || {}
                const economicos = result.DadosEconomicos || result.dadosEconomicos || result.dados_economicos || {}
                const telefonesRaw = result.telefones || result.Telefones || result.phones || []

                // Nome
                const nome = basicos.nome || basicos.Nome || basicos.name || null

                // Data de nascimento
                let rawDataNasc = basicos.dataNascimento || basicos.DataNascimento || basicos.data_nascimento || basicos.nascimento || null
                let dataNasc = null

                if (rawDataNasc) {
                    const dataStr = String(rawDataNasc).trim()
                    const match = dataStr.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/)
                    if (match) dataNasc = `${match[3]}-${match[2]}-${match[1]}`
                    else dataNasc = dataStr
                }

                // Telefones - Pega e limpa
                let listaTels: string[] = []
                if (Array.isArray(telefonesRaw) && telefonesRaw.length > 0) {
                    listaTels = telefonesRaw.map(t => {
                        const val = t.telefone || t.Telefone || t.phone || t.numero || (typeof t === 'string' ? t : null)
                        return val ? String(val).replace(/\D/g, '') : null
                    }).filter(Boolean) as string[]
                    listaTels = Array.from(new Set(listaTels))
                }

                // === VERIFICAR WHATSAPP VIA API EXTERNA ===
                let telefoneComStatus = ''
                if (listaTels.length > 0) {
                    const delsChecked: string[] = []

                    // Se tiver Token do Checker configurado
                    if (apiWppToken && apiWppUrl) {
                        try {
                            console.log(`[WA] Verificando ${listaTels.length} números para CPF ${cpfLimpo}...`)

                            // Check via POST (formato comum de APIs de $1)
                            for (const tel of listaTels) {
                                try {
                                    // Adiciona DDI 55 se não tiver
                                    const telWithDdi = tel.length <= 11 ? `55${tel}` : tel

                                    const waRes = await fetch(apiWppUrl, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            numbers: telWithDdi, // Algumas APIs aceitam string ou array
                                            token: apiWppToken
                                        })
                                    })

                                    const waData = await waRes.json()
                                    // Lógica de sucesso (pode variar por API, mas costuma ser 1 ou 'success')
                                    // ekycpro/checknumber.ai costuma retornar status 1 no data
                                    const hasWa = waData.data?.[telWithDdi] === 1 ||
                                        waData.data?.[telWithDdi]?.status === 1 ||
                                        waData.status === 1 ||
                                        waData.success === true

                                    delsChecked.push(`${tel} ${hasWa ? '✅' : '❌'}`)
                                } catch (e) {
                                    delsChecked.push(tel) // Falhou na checagem, mantém puro
                                }
                            }
                        } catch (waErr) {
                            console.error('[WA] Erro na integração externa:', waErr)
                            listaTels.forEach(t => delsChecked.push(t))
                        }
                    } else {
                        // Sem checker, mantém lista pura
                        listaTels.forEach(t => delsChecked.push(t))
                    }

                    telefoneComStatus = delsChecked.join(', ')
                }

                // Renda
                const economicosData = result.DadosEconomicos || result.dadosEconomicos || {}
                const rendaRaw = economicosData.renda || economicosData.Renda || economicosData.income || ''
                let rendaNum: number | null = null
                if (rendaRaw) {
                    rendaNum = parseFloat(String(rendaRaw).replace(/\./g, '').replace(',', '.'))
                }

                // Score
                const scoreObj = economicosData.score || economicosData.Score || {}
                const scoreVal = scoreObj.scoreCSBA || scoreObj.scoreCSB || scoreObj.score || null

                // Montar update
                const novosDados: Record<string, any> = {}
                if (nome) novosDados.nome = nome
                if (dataNasc) novosDados.data_nascimento = dataNasc
                if (rendaNum && !isNaN(rendaNum)) novosDados.renda = String(rendaNum)
                if (scoreVal) novosDados.score = String(scoreVal)
                if (telefoneComStatus) {
                    novosDados.telefone = telefoneComStatus
                }

                if (Object.keys(novosDados).length === 0 || !telefoneComStatus) {
                    await supabase.from('clientes').delete().eq('id', clienteId)
                    resultados.push({ cpf: cpfLimpo, sucesso: false, erro: `Sem telefone útil. (Excluído)` })
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
