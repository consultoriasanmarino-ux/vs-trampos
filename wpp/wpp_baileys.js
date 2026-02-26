require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const pino = require('pino');

// Configurações Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const logger = pino({ level: 'silent' });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger,
        browser: ['VS Trampos', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const qrDataURL = await QRCode.toDataURL(qr);
            await updateStatusInSupabase('qr_ready', qrDataURL);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            await updateStatusInSupabase('disconnected', null);
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('🚀 WhatsApp conectado! Iniciando validador de números...');
            await updateStatusInSupabase('connected', null);

            // Inicia o loop de validação
            validarNumerosPendentes(sock);
        }
    });
}

// Função que fica verificando se tem números novos para validar no Supabase
async function validarNumerosPendentes(sock) {
    console.log('🧐 Verificando números pendentes de validação...');

    while (true) {
        try {
            // Pega leads que tenham telefone mas o status_whatsapp seja nulo
            const { data: leads, error } = await supabase
                .from('clientes')
                .select('id, telefone')
                .is('status_whatsapp', null)
                .not('telefone', 'is', null)
                .limit(10); // Processa de 10 em 10 para não ser banido

            if (error) throw error;

            if (leads && leads.length > 0) {
                console.log(`🔍 Validando bloco de ${leads.length} números...`);

                for (const lead of leads) {
                    const telLimpo = lead.telefone.replace(/\D/g, '');
                    const jid = `55${telLimpo}@s.whatsapp.net`;

                    try {
                        // Verifica no WhatsApp se o número existe
                        const [result] = await sock.onWhatsApp(jid);

                        const status = result?.exists ? 'ativo' : 'invalido';

                        await supabase
                            .from('clientes')
                            .update({ status_whatsapp: status })
                            .eq('id', lead.id);

                        console.log(`✅ Número ${telLimpo}: ${status.toUpperCase()}`);
                    } catch (err) {
                        console.error(`❌ Erro ao validar ${telLimpo}:`, err.message);
                    }

                    // Delay para evitar bloqueio do WhatsApp
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        } catch (err) {
            console.error('❌ Erro no loop de validação:', err.message);
        }

        // Espera 10 segundos antes de olhar o banco de novo
        await new Promise(r => setTimeout(r, 10000));
    }
}

async function updateStatusInSupabase(status, qrCode) {
    try {
        await supabase
            .from('config_whatsapp')
            .upsert({ id: 1, status, qr_code: qrCode, updated_at: new Date().toISOString() });
    } catch (err) {
        console.error('❌ Erro Supabase:', err.message);
    }
}

connectToWhatsApp();
