import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Classifica se é celular (WhatsApp provável), fixo ou inválido
function classificarTelefone(tel: string): 'ativo' | 'fixo' | 'invalido' {
    const limpo = tel.replace(/\D/g, '')
    if (limpo.length >= 11 && limpo.charAt(2) === '9') return 'ativo'
    if (limpo.length >= 10) return 'fixo'
    return 'invalido'
}

// Parser do formato Leads_completos.txt
function parseTxtLeads(text: string) {
    const blocos = text.split(/^-{10,}$/m)
    const leads: any[] = []

    for (const bloco of blocos) {
        const lines = bloco.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        if (lines.length === 0) continue

        const lead: any = {}

        for (const line of lines) {
            if (line.startsWith('NOME:')) {
                lead.nome = line.replace('NOME:', '').trim()
            } else if (line.startsWith('CPF:')) {
                lead.cpf = line.replace('CPF:', '').trim().replace(/[.\-\s]/g, '')
            } else if (line.startsWith('NASC:')) {
                lead.data_nascimento = line.replace('NASC:', '').trim()
            } else if (line.startsWith('RENDA:')) {
                // Formato: "RENDA: 581,90 | SCORE: N/A"
                const parts = line.replace('RENDA:', '').trim()
                const rendaPart = parts.split('|')[0]?.trim()
                const scorePart = parts.split('SCORE:')[1]?.trim()

                if (rendaPart && rendaPart !== 'N/A') {
                    const rendaNum = parseFloat(rendaPart.replace(/\./g, '').replace(',', '.'))
                    if (!isNaN(rendaNum)) lead.renda = rendaNum
                }

                if (scorePart && scorePart !== 'N/A') {
                    const scoreNum = parseInt(scorePart)
                    if (!isNaN(scoreNum)) lead.score = scoreNum
                }
            } else if (line.startsWith('CELULARES:') || line.startsWith('TELEFONES:')) {
                const telsStr = line.replace(/^(CELULARES|TELEFONES):/, '').trim()
                if (telsStr && telsStr !== 'Nenhum' && telsStr !== 'N/A') {
                    // Pega o primeiro telefone
                    const primeiro = telsStr.split(',')[0].trim()
                    lead.telefone = primeiro
                }
            }
        }

        if (lead.cpf) {
            leads.push(lead)
        }
    }

    return leads
}

// Parser CSV
function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return []

    const headerLine = lines[0].toLowerCase()
    const separator = headerLine.includes(';') ? ';' : ','
    const headers = headerLine.split(separator).map(h => h.trim().replace(/"/g, ''))

    return lines.slice(1).map(line => {
        const values = line.split(separator).map(v => v.trim().replace(/"/g, ''))
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return obj
    })
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Arquivo é obrigatório.' }, { status: 400 })
        }

        const text = await file.text()
        const fileName = file.name.toLowerCase()

        let leads: any[] = []

        // Detectar formato
        if (fileName.endsWith('.json')) {
            leads = JSON.parse(text)
            if (!Array.isArray(leads)) leads = [leads]
        } else if (fileName.endsWith('.csv')) {
            leads = parseCsv(text)
        } else {
            // TXT - pode ser CSV ou formato de blocos (Leads_completos)
            if (text.includes('NOME:') && text.includes('CPF:')) {
                // Formato Leads_completos.txt
                leads = parseTxtLeads(text)
            } else if (text.includes(',') || text.includes(';')) {
                // Tentar como CSV
                leads = parseCsv(text)
            } else {
                return NextResponse.json({ error: 'Formato de arquivo não reconhecido.' }, { status: 400 })
            }
        }

        if (leads.length === 0) {
            return NextResponse.json({ error: 'Nenhum lead encontrado no arquivo.' }, { status: 400 })
        }

        let atualizados = 0
        let erros = 0

        for (const lead of leads) {
            const cpf = (lead.cpf || '').toString().replace(/[.\-\s]/g, '')
            if (!cpf || cpf.length !== 11) {
                erros++
                continue
            }

            const updateData: any = {}
            if (lead.nome) updateData.nome = lead.nome
            if (lead.data_nascimento) updateData.data_nascimento = lead.data_nascimento
            if (lead.renda) updateData.renda = lead.renda
            if (lead.score) updateData.score = lead.score

            if (lead.telefone) {
                updateData.telefone = lead.telefone
                updateData.status_whatsapp = classificarTelefone(lead.telefone)
            }

            // Só atualiza se tem algo pra atualizar
            if (Object.keys(updateData).length === 0) {
                erros++
                continue
            }

            const { error } = await supabase
                .from('clientes')
                .update(updateData)
                .eq('cpf', cpf)

            if (error) {
                erros++
            } else {
                atualizados++
            }
        }

        return NextResponse.json({
            success: true,
            message: `${atualizados} lead(s) enriquecido(s). ${erros > 0 ? `${erros} ignorado(s).` : ''}`,
            total: leads.length,
            atualizados,
            erros,
        })
    } catch (err: any) {
        console.error('Erro no enriquecimento:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message || 'desconhecido'}` }, { status: 500 })
    }
}
