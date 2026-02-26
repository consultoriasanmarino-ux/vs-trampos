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

// Filtra mensagens de ruído do Baileys no console
const originalError = console.error;
const originalLog = console.log;
const filtros = ['Bad MAC', 'Closing session', 'Failed to decrypt', 'Session error', 'SessionEntry', '_chains', 'registrationId', 'currentRatchet', 'ephemeralKeyPair', 'rootKey', 'indexInfo', 'baseKey', 'pendingPreKey', 'chainKey', 'Buffer', 'privKey', 'pubKey', 'previousCounter', 'remoteIdentityKey', 'signedKeyId', 'preKeyId', 'chainType', 'messageKeys', 'baseKeyType', 'Closing open session'];

console.error = (...args) => {
    const msg = args.map(String).join(' ');
    if (filtros.some(f => msg.includes(f))) return;
    originalError.apply(console, args);
};
console.log = (...args) => {
    const msg = args.map(String).join(' ');
    if (filtros.some(f => msg.includes(f))) return;
    originalLog.apply(console, args);
};

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
        browser: ['VS Trampos', 'Chrome', '1.0.0'],
        // Evita processar mensagens (não precisamos, só validamos números)
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect: false,
        getMessage: async () => ({ conversation: '' }),
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
                .limit(5);

            if (error) throw error;

            if (leads && leads.length > 0) {
                console.log(`🔍 Validando bloco de ${leads.length} leads...`);

                for (const lead of leads) {
                    // Pode ter múltiplos números separados por vírgula
                    const telefones = lead.telefone.split(',').map(t => t.trim()).filter(Boolean);

                    let temWhatsapp = false;
                    let temFixo = false;
                    const resultados = [];

                    for (const tel of telefones) {
                        const telLimpo = tel.replace(/\D/g, '');
                        if (!telLimpo) continue;

                        // Adiciona 55 se não tiver
                        const numero = telLimpo.startsWith('55') ? telLimpo : `55${telLimpo}`;
                        const jid = `${numero}@s.whatsapp.net`;

                        try {
                            const results = await sock.onWhatsApp(jid);
                            const result = results[0];

                            if (result?.exists) {
                                temWhatsapp = true;
                                resultados.push(`${tel} ✅`);
                                console.log(`  ✅ ${tel}: ATIVO (WhatsApp)`);
                            } else {
                                // Classifica: 10 dígitos sem DDD55 = fixo, senão inválido
                                if (telLimpo.length === 10) {
                                    temFixo = true;
                                    resultados.push(`${tel} ☎️`);
                                    console.log(`  📞 ${tel}: FIXO`);
                                } else {
                                    resultados.push(`${tel} ❌`);
                                    console.log(`  ❌ ${tel}: INVÁLIDO`);
                                }
                            }
                        } catch (err) {
                            resultados.push(`${tel} ❌`);
                            console.error(`  ❌ Erro ao validar ${tel}:`, err.message);
                        }

                        // Delay entre cada número para evitar ban
                        await new Promise(r => setTimeout(r, 1500));
                    }

                    // Define status geral do lead
                    let statusGeral = 'invalido';
                    if (temWhatsapp) {
                        statusGeral = 'ativo';
                    } else if (temFixo) {
                        statusGeral = 'fixo';
                    }

                    // Atualiza no banco com o status geral e a lista de telefones com ícones
                    await supabase
                        .from('clientes')
                        .update({
                            status_whatsapp: statusGeral,
                            telefone: resultados.join(', ')
                        })
                        .eq('id', lead.id);

                    console.log(`📋 Lead ${lead.id.substring(0, 8)}: ${statusGeral.toUpperCase()} (${resultados.join(', ')})`);
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
