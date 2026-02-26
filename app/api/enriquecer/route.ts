import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Converte data BR (DD/MM/YYYY) para ISO (YYYY-MM-DD)
function parseDateBR(dateStr: string | undefined | null): string | null {
    if (!dateStr) return null
    const parts = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (!parts) return dateStr // Se não casar o padrão, retorna como veio
    const [, dia, mes, ano] = parts
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
}

// Parser do formato Leads_completos.txt
function parseTxtLeads(text: string) {
    // No arquivo do usuário, os leads são separados por 50 traços
    const rawBlocos = text.split(/^-{10,}$/m)
    const leads: any[] = []

    for (const bloco of rawBlocos) {
        const lines = bloco.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        if (lines.length === 0) continue

        const lead: any = {}

        for (const line of lines) {
            //Regex para capturar valor apos a chave de forma insensível a maiúsculas
            if (/NOME:/i.test(line)) {
                lead.nome = line.split(/NOME:/i)[1]?.trim()
            } else if (/CPF:/i.test(line)) {
                const cpfRaw = line.split(/CPF:/i)[1]?.trim() || ''
                // Limpa e garante 11 dígitos com zeros à esquerda
                lead.cpf = cpfRaw.replace(/\D/g, '').padStart(11, '0')
            } else if (/NASC:/i.test(line)) {
                const nascRaw = line.split(/NASC:/i)[1]?.trim()
                // Converte DD/MM/YYYY para YYYY-MM-DD direto no parser
                lead.data_nascimento = parseDateBR(nascRaw)
            } else if (/RENDA:/i.test(line)) {
                const parts = line.split(/RENDA:/i)[1]?.trim() || ''
                // O formato é "RENDA: 581,90 | SCORE: N/A"
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
            } else if (/CELULARES:|TELEFONES:|CELULAR:/i.test(line)) {
                // Pega tudo após o primeiro :
                const parts = line.split(':')
                const telsStr = parts.slice(1).join(':').trim()
                if (telsStr && telsStr !== 'Nenhum' && telsStr !== 'N/A') {
                    // Salva TODOS os telefones separados por vírgula (limpos)
                    const allTels = telsStr.split(',')
                        .map((t: string) => t.trim())
                        .filter((t: string) => t.length > 0)
                    if (allTels.length > 0) {
                        lead.telefone = allTels.join(', ')
                    }
                }
            }
        }

        // Só adiciona se tiver um CPF válido de 11 dígitos
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
        const errosDetalhes: string[] = []

        // Processa um por um para garantir o merge correto (upsert)
        for (const lead of leads) {
            const cpf = lead.cpf.replace(/\D/g, '').padStart(11, '0')

            const record: any = {
                cpf: cpf,
                nome: lead.nome || null,
                data_nascimento: parseDateBR(lead.data_nascimento),
                renda: lead.renda || null,
                score: lead.score || null,
                telefone: lead.telefone || null,
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
            if (lead.telefone) record.status_whatsapp = null;

            const { error } = await supabase
                .from('clientes')
                .upsert(record, { onConflict: 'cpf' })

            if (error) {
                const detalhe = `CPF ${cpf}: ${error.message} | code: ${error.code}`
                console.error(detalhe)
                errosDetalhes.push(detalhe)
                erros++
            } else {
                processados++
            }
        }

        // Mensagem com diagnóstico completo
        let msg = `Parseados: ${leads.length} | Sucesso: ${processados} | Erros: ${erros}`
        if (errosDetalhes.length > 0) {
            msg += ` | Detalhes: ${errosDetalhes.join(' ;; ')}`
        }

        return NextResponse.json({
            success: true,
            message: msg,
            total: leads.length,
            processados,
            erros,
            errosDetalhes
        })
    } catch (err: any) {
        console.error('Erro geral:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message}` }, { status: 500 })
    }
}
