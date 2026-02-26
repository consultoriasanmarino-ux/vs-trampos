import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Parser do formato Leads_completos.txt
function parseTxtLeads(text: string) {
    const blocos = text.split(/^-{10,}$/m)
    const leads: any[] = []

    for (const bloco of blocos) {
        const lines = bloco.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        if (lines.length === 0) continue

        const lead: any = {}

        for (const line of lines) {
            const upLine = line.toUpperCase()
            if (upLine.startsWith('NOME:')) {
                lead.nome = line.substring(5).trim()
            } else if (upLine.startsWith('CPF:')) {
                lead.cpf = line.substring(4).trim().replace(/[.\-\s]/g, '')
            } else if (upLine.startsWith('NASC:')) {
                lead.data_nascimento = line.substring(5).trim()
            } else if (upLine.startsWith('RENDA:')) {
                const parts = line.substring(6).trim()
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
            } else if (upLine.startsWith('CELULARES:') || upLine.startsWith('TELEFONES:') || upLine.startsWith('CELULAR:')) {
                const telsStr = line.split(':')[1]?.trim()
                if (telsStr && telsStr !== 'Nenhum' && telsStr !== 'N/A') {
                    // Pega o primeiro telefone da lista
                    lead.telefone = telsStr.split(',')[0].trim()
                }
            }
        }

        if (lead.cpf && lead.cpf.length === 11) {
            leads.push(lead)
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

            const record = {
                cpf: cpf,
                nome: lead.nome || null,
                data_nascimento: lead.data_nascimento || null,
                renda: lead.renda || null,
                score: lead.score || null,
                telefone: lead.telefone || null,
                // Deixa status_whatsapp como null se tiver telefone novo para o servidor local validar
                status_whatsapp: null
            }

            // Remove campos nulos para não sobrescrever dados existentes com vazio caso já existam
            Object.keys(record).forEach(key => {
                if ((record as any)[key] === null) delete (record as any)[key];
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
