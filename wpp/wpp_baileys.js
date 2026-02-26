require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

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
        printQRInTerminal: true, // Mostra no terminal também por segurança
        auth: state,
        logger,
        browser: ['VS Trampos', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('✅ Novo QR Code gerado. Atualizando no site...');
            const qrDataURL = await QRCode.toDataURL(qr);
            await updateStatusInSupabase('qr_ready', qrDataURL);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Conexão fechada. Reconectando:', shouldReconnect);
            await updateStatusInSupabase('disconnected', null);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('🚀 WhatsApp conectado com sucesso!');
            await updateStatusInSupabase('connected', null);
        }
    });
}

async function updateStatusInSupabase(status, qrCode) {
    try {
        // Tenta atualizar ou inserir o status da conexão
        const { error } = await supabase
            .from('config_whatsapp')
            .upsert({
                id: 1,
                status: status,
                qr_code: qrCode,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) {
            console.error('❌ Erro ao atualizar Supabase:', error.message);
            console.log('💡 Certifique-se de que a tabela "config_whatsapp" existe e o RLS está desativado.');
        }
    } catch (err) {
        console.error('❌ Erro inesperado:', err);
    }
}

// Inicia
console.log('--- VS Trampos | WhatsApp Server ---');
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_KEY não definidos no .env');
    process.exit(1);
}

connectToWhatsApp();
