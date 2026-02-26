import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Simula validação de WhatsApp
function classificarTelefone(telefone: string): 'ativo' | 'fixo' | 'invalido' {
    const limpo = telefone.replace(/\D/g, '')

    if (limpo.length < 10) return 'invalido'

    // Celular: DDD + 9 + 8 dígitos (11 dígitos total)
    if (limpo.length === 11 && limpo[2] === '9') return 'ativo'

    // Fixo: DDD + 8 dígitos (10 dígitos)
    if (limpo.length === 10) return 'fixo'

    return 'invalido'
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Arquivo é obrigatório.' }, { status: 400 })
        }

        const text = await file.text()
        let leads: any[] = []

        // Detecta formato
        const fileName = file.name.toLowerCase()
        if (fileName.endsWith('.json')) {
            leads = JSON.parse(text)
        } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
            const lines = text.split(/\r?\n/).filter(l => l.trim())
            if (lines.length < 2) {
                return NextResponse.json({ error: 'Arquivo sem dados suficientes.' }, { status: 400 })
            }

            // Detecta separador
            const sep = lines[0].includes(';') ? ';' : ','
            const headers = lines[0].split(sep).map(h => h.trim().toLowerCase())

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(sep)
                const obj: any = {}
                headers.forEach((h, idx) => {
                    obj[h] = cols[idx]?.trim() || null
                })
                leads.push(obj)
            }
        }

        let atualizados = 0
        let erros = 0

        for (const lead of leads) {
            const cpf = lead.cpf?.replace(/[.\-\s]/g, '')
            if (!cpf) { erros++; continue }

            const updateData: any = {}
            if (lead.nome) updateData.nome = lead.nome
            if (lead.data_nascimento) updateData.data_nascimento = lead.data_nascimento
            if (lead.idade) updateData.data_nascimento = lead.idade // aceita campo "idade" como alias
            if (lead.renda) updateData.renda = parseFloat(lead.renda) || null
            if (lead.score) updateData.score = parseInt(lead.score) || null

            // Classificar telefone (simula Baileys)
            if (lead.telefone || lead.telefones || lead.celular) {
                const tel = lead.telefone || lead.telefones || lead.celular
                updateData.telefone = tel
                updateData.status_whatsapp = classificarTelefone(tel)
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
            message: `${atualizados} leads atualizados. ${erros} erros.`,
            atualizados,
            erros,
        })
    } catch (err) {
        console.error('Erro enriquecer:', err)
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
    }
}
