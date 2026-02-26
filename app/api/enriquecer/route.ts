import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Parser do formato Leads_completos.txt
function parseTxtLeads(text: string) {
    // Tenta dividir por traços primeiro ou por NOME:
    let rawBlocos = text.split(/^-{5,}$/m)
    if (rawBlocos.length <= 1) {
        rawBlocos = text.split(/(?=NOME:)/gi)
    }

    const leads: any[] = []

    for (const bloco of rawBlocos) {
        const lines = bloco.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        if (lines.length === 0) continue

        const lead: any = {}

        for (const line of lines) {
            const upLine = line.toUpperCase()

            if (upLine.includes('NOME:')) {
                lead.nome = line.split(/NOME:/i)[1]?.trim()
            } else if (upLine.includes('CPF:')) {
                const cpfRaw = line.split(/CPF:/i)[1]?.trim() || ''
                lead.cpf = cpfRaw.replace(/\D/g, '')
            } else if (upLine.includes('NASC:')) {
                lead.data_nascimento = line.split(/NASC:/i)[1]?.trim()
            } else if (upLine.includes('RENDA:')) {
                const parts = line.split(/RENDA:/i)[1]?.trim() || ''
                const rendaPart = parts.split('|')[0]?.trim()
                const scorePart = parts.split(/SCORE:/i)[1]?.trim()

                if (rendaPart && rendaPart !== 'N/A') {
                    const rendaNum = parseFloat(rendaPart.replace(/\./g, '').replace(',', '.'))
                    if (!isNaN(rendaNum)) lead.renda = rendaNum
                }
                if (scorePart && scorePart !== 'N/A') {
                    const scoreNum = parseInt(scorePart)
                    if (!isNaN(scoreNum)) lead.score = scoreNum
                }
            } else if (upLine.includes('CELULARES:') || upLine.includes('TELEFONES:') || upLine.includes('CELULAR:')) {
                const parts = line.split(':')
                const telsStr = parts.slice(1).join(':').trim()
                if (telsStr && telsStr !== 'Nenhum' && telsStr !== 'N/A') {
                    const firstTel = telsStr.split(',')[0].trim()
                    const cleanTel = firstTel.replace(/\D/g, '')
                    if (cleanTel) lead.telefone = cleanTel
                }
            }
        }

        if (lead.cpf) {
            // Preenche com zeros à esquerda até ter 11 dígitos
            lead.cpf = lead.cpf.padStart(11, '0')

            if (lead.cpf.length === 11) {
                leads.push(lead)
            }
        }
    }
    return leads
}

// Parser CSV simples
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
        const bancoId = formData.get('banco_id') as string

        if (!file) return NextResponse.json({ error: 'Arquivo é obrigatório.' }, { status: 400 })

        const text = await file.text()
        const fileName = file.name.toLowerCase()
        let leads: any[] = []

        if (fileName.endsWith('.json')) {
            leads = JSON.parse(text)
            if (!Array.isArray(leads)) leads = [leads]
        } else if (fileName.endsWith('.csv')) {
            leads = parseCsv(text)
        } else {
            if (text.includes('NOME:') && text.includes('CPF:')) {
                leads = parseTxtLeads(text)
            } else {
                leads = parseCsv(text) // Tenta CSV como fallback para TXT
            }
        }

        if (leads.length === 0) return NextResponse.json({ error: 'Nenhum lead válido encontrado.' }, { status: 400 })

        let processados = 0
        let erros = 0

        // Processa um por um para garantir o merge correto (upsert)
        for (const lead of leads) {
            const cpf = lead.cpf.replace(/\D/g, '')

            const record: any = {
                cpf: cpf,
                nome: lead.nome || null,
                data_nascimento: lead.data_nascimento || null,
                renda: lead.renda || null,
                score: lead.score || null,
                telefone: lead.telefone || null,
                // Deixa status_whatsapp como null se tiver telefone novo para o servidor local validar
                status_whatsapp: null
            }

            // Se recebemos um bancoId, associamos o lead a ele
            if (bancoId) {
                record.banco_principal_id = bancoId
            }

            // Remove campos nulos para não sobrescrever dados existentes com vazio caso já existam
            Object.keys(record).forEach(key => {
                if (record[key] === null) delete record[key];
            });
            // Se tem telefone, forçamos o status_whatsapp para nulo para o validador pegar
            if (lead.telefone) (record as any).status_whatsapp = null;

            const { error } = await supabase
                .from('clientes')
                .upsert(record, { onConflict: 'cpf' })

            if (error) {
                console.error(`Erro no CPF ${cpf}:`, error.message)
                erros++
            } else {
                processados++
            }
        }

        return NextResponse.json({
            success: true,
            message: `${processados} leads processados (criados ou atualizados).`,
            total: leads.length,
            erros
        })
    } catch (err: any) {
        console.error('Erro geral:', err)
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
    }
}
