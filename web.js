require('dotenv').config();

// 🧠 Réduit l'empreinte mémoire native de sharp (utilisé par sticker/toimg) :
// désactive son cache interne et limite son pool de threads à 1. Sur un hôte
// à 512 Mo (Render free), c'est souvent plusieurs dizaines de Mo économisés.
try {
    const sharp = require('sharp');
    sharp.cache(false);
    sharp.concurrency(1);
} catch (e) { /* sharp pas encore installé, ignore */ }


// 🧹 Filtre les logs bruyants de Baileys/libsignal — bug connu qui affiche
// l'intégralité d'une session cryptographique (avec clés) à chaque fermeture
// de session, ce qui remplit la mémoire des logs et provoque des crashes.
const _origConsoleLog = console.log;
console.log = (...args) => {
    const first = args[0];
    if (typeof first === 'string' && (
        first.startsWith('Closing session') ||
        first.startsWith('Closing stale open session') ||
        first.startsWith('Closing open session')
    )) {
        return;
    }
    _origConsoleLog(...args);
};

const fs = require('fs');
const path = require('path');
const express = require('express');
const pino = require('pino');
const QRCode = require('qrcode');
const { Boom } = require('@hapi/boom');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const settings = require('./settings');
const store = require('./lib/lightweight_store');

store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

global.botname = settings.botName || 'SALGA-XMD';
global.themeemoji = '•';

const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// sessions[id] = { sock, status, qr, code, number }
const sessions = {};

function sanitizeId(id) {
    return String(id).replace(/[^0-9a-zA-Z_]/g, '');
}

// ── Démarre (ou reprend) l'instance bot complète pour un numéro donné ──
const connectingLock = new Set();

async function startUserSession(number, { usePairingCode = false } = {}) {
    const id = sanitizeId(number);
    // ⚠️ Empêche deux connexions simultanées pour le même numéro (ex: reprise
    // automatique au démarrage + un pairing lancé au même moment). WhatsApp
    // n'accepte qu'une connexion à la fois par session — en avoir 2 en même
    // temps fait que WhatsApp éjecte l'une des deux en boucle (déconnexions
    // répétées toutes les quelques minutes).
    if (sessions[id]?.sock && sessions[id].status === 'connected') return sessions[id];
    if (connectingLock.has(id)) return sessions[id];
    connectingLock.add(id);

    // 🧹 Nettoyage de l'ancien socket avant de recréer une nouvelle session,
    // pour éviter que les anciens listeners / caches restent en mémoire.
    if (sessions[id]?.sock) {
        try {
            sessions[id].sock.ev.removeAllListeners();
            sessions[id].sock.ws?.close();
        } catch {}
    }

    const sessionDir = path.join(SESSIONS_DIR, id);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    let state, saveCreds, version;
    try {
        ({ state, saveCreds } = await useMultiFileAuthState(sessionDir));
        ({ version } = await fetchLatestBaileysVersion());
    } catch (e) {
        connectingLock.delete(id);
        throw e;
    }

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: usePairingCode ? Browsers.ubuntu('Chrome') : Browsers.macOS('Safari'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
        },
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    sessions[id] = {
        sock,
        status: usePairingCode ? 'requesting_code' : 'waiting_qr',
        qr: null,
        code: null,
        number
    };
    connectingLock.delete(id); // le socket existe désormais, plus besoin du verrou

    // ── Demande du code de pairing (si pas encore enregistré) ──
    if (usePairingCode && !state.creds.registered) {
        try {
            await new Promise(r => setTimeout(r, 1500)); // laisser le socket s'initialiser
            const rawCode = await sock.requestPairingCode(number.replace(/[^0-9]/g, ''));
            sessions[id].code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
            sessions[id].status = 'waiting_code';
        } catch (e) {
            console.error(`❌ [${id}] Erreur génération pairing code:`, e.message);
            sessions[id].status = 'error';
            sessions[id].error = e.message;
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !usePairingCode) {
            sessions[id].qr = await QRCode.toDataURL(qr);
            sessions[id].status = 'waiting_qr';
        }

        if (connection === 'open') {
            sessions[id].status = 'connected';
            sessions[id].qr = null;
            sessions[id].code = null;
            console.log(`✅ [${id}] SALGA-XMD connecté (+${number}) !`);

            try {
                const ownJid = sock.user.id.split(':')[0].split('@')[0] + '@s.whatsapp.net';
                const imgPath = path.join(__dirname, 'assets', 'bot_image.jpg');
                const caption = `╔══✦*𝗦𝗔𝗟𝗚𝗔-𝗠𝗗*✦═══>
║»🥷 *✅ BOT CONNECTÉ !*
╠══════════════════
║»📞 *Numéro :* +${number}
║»⏰ *Heure :* ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'GMT', hour: '2-digit', minute: '2-digit' })}
║»🌐 *Système :* CENTRAL-HEX
╚══════════════════>

🎉 Ton bot est maintenant actif et opérationnel !
💡 Tape *.menu* pour découvrir toutes les commandes.

> 🥷 _by CENTRAL-HEX · CENTRAL-HEX_`;

                if (fs.existsSync(imgPath)) {
                    await sock.sendMessage(ownJid, { image: fs.readFileSync(imgPath), caption });
                } else {
                    await sock.sendMessage(ownJid, { text: caption });
                }
            } catch (e) {
                console.error(`❌ [${id}] Message de bienvenue:`, e.message);
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error instanceof Boom
                ? lastDisconnect.error.output?.statusCode
                : null;

            // ── Cas important (flux "code de pairing") ──
            // WhatsApp ferme systématiquement ce socket temporaire une fois le code
            // utilisé sur le téléphone — Baileys ne le reconnecte PAS automatiquement.
            // Il faut donc vérifier si les creds sont maintenant enregistrées et,
            // si oui, considérer que c'est un succès et relancer une session propre.
            const registered = !!sock.authState?.creds?.registered;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            if (registered && sessions[id].status !== 'connected') {
                console.log(`♻️ [${id}] Pairing réussi (détecté à la fermeture), relance de la session...`);
                setTimeout(() => startUserSession(number, { usePairingCode: false }), 2000);
                return;
            }

            if (shouldReconnect) {
                setTimeout(() => startUserSession(number, { usePairingCode: false }), 3000);
            } else {
                console.log(`🚪 [${id}] Déconnecté (logout). Session supprimée.`);
                sessions[id].status = 'logged_out';
                try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
            }
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try { await handleMessages(sock, chatUpdate, true); } catch (e) { console.error('handleMessages error:', e.message); }
    });
    sock.ev.on('group-participants.update', async (update) => {
        try { await handleGroupParticipantUpdate(sock, update); } catch (e) { console.error('groupParticipants error:', e.message); }
    });
    sock.ev.on('messages.reaction', async (status) => {
        try { await handleStatus(sock, status); } catch (e) { console.error('status error:', e.message); }
    });

    return sessions[id];
}

// Certaines commandes internes déclenchent un self-pairing depuis le chat
global.startUserSession = startUserSession;

function getSession(id) {
    return sessions[sanitizeId(id)];
}

// ── Reprend automatiquement toutes les sessions déjà liées (survit à un redémarrage) ──
async function resumeAllSessions() {
    const ids = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    for (const id of ids) {
        if (!fs.existsSync(path.join(SESSIONS_DIR, id, 'creds.json'))) continue;
        console.log(`♻️ Reprise automatique de la session : ${id}`);
        try { await startUserSession(id, { usePairingCode: false }); }
        catch (e) { console.error(`❌ Échec reprise ${id}:`, e.message); }
    }
}

// ═══════════════════════════════════════════════════════════
// 🌐 SERVEUR WEB
// ═══════════════════════════════════════════════════════════
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Demander un code de pairing pour un numéro ──
// Limite à 1 seule session WhatsApp active à la fois — protège la RAM du
// serveur (512 Mo sur Render free). Change MAX_SESSIONS dans le .env si tu
// passes sur un plan avec plus de mémoire.
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_SESSIONS || '1', 10);

function countActiveSessions(excludeId) {
    return Object.entries(sessions).filter(([id, s]) =>
        id !== excludeId && (s.status === 'connected' || s.status === 'waiting_code' || s.status === 'waiting_qr' || s.status === 'requesting_code')
    ).length;
}

app.post('/api/pair', async (req, res) => {
    try {
        const { number } = req.body;
        const cleanNumber = String(number || '').replace(/[^0-9]/g, '');
        if (!cleanNumber || cleanNumber.length < 8) {
            return res.status(400).json({ error: 'Numéro invalide. Utilise le format international sans + (ex: 224666952949).' });
        }

        const sessionId = sanitizeId(cleanNumber);

        if (countActiveSessions(sessionId) >= MAX_CONCURRENT_SESSIONS) {
            return res.status(429).json({
                error: `Une session est déjà active. Déconnecte-la d'abord depuis le dashboard admin (/admin) avant d'en connecter une nouvelle — ceci protège la mémoire du serveur.`
            });
        }

        await startUserSession(cleanNumber, { usePairingCode: true });

        let tries = 0;
        while (tries < 30) {
            const s = getSession(sessionId);
            if (s?.status === 'waiting_code' && s.code) return res.json({ sessionId, code: s.code });
            if (s?.status === 'error') return res.status(500).json({ error: s.error || 'Erreur génération du code.' });
            if (s?.status === 'connected') return res.json({ sessionId, connected: true });
            await new Promise(r => setTimeout(r, 500));
            tries++;
        }
        return res.status(504).json({ error: 'Le code met trop de temps à être généré, réessaie.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ── Démarrer une session en mode QR ──
app.post('/api/qr', async (req, res) => {
    try {
        if (countActiveSessions(null) >= MAX_CONCURRENT_SESSIONS) {
            return res.status(429).json({
                error: `Une session est déjà active. Déconnecte-la d'abord depuis le dashboard admin (/admin) avant d'en connecter une nouvelle — ceci protège la mémoire du serveur.`
            });
        }
        const sessionId = `qr_${Date.now()}`;
        await startUserSession(sessionId, { usePairingCode: false });
        res.json({ sessionId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── Vérifier l'état d'une session ──
app.get('/api/status/:sessionId', (req, res) => {
    const s = getSession(req.params.sessionId);
    if (!s) return res.status(404).json({ error: 'Session introuvable' });
    res.json({ status: s.status, qr: s.qr || null, code: s.code || null });
});

// ── Déconnecter / réinitialiser une session (efface tout, permet un nouveau pairing) ──
app.post('/api/reset', async (req, res) => {
    try {
        const { number } = req.body;
        const cleanNumber = String(number || '').replace(/[^0-9]/g, '');
        if (!cleanNumber || cleanNumber.length < 8) {
            return res.status(400).json({ error: 'Numéro invalide.' });
        }

        const id = sanitizeId(cleanNumber);
        const sessionDir = path.join(SESSIONS_DIR, id);

        if (sessions[id]?.sock) {
            try { await sessions[id].sock.logout(); } catch (e) {}
            try { sessions[id].sock.ws?.close(); } catch (e) {}
        }
        delete sessions[id];

        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }

        console.log(`🗑️ [${id}] Session réinitialisée manuellement.`);
        res.json({ ok: true, message: 'Session réinitialisée. Tu peux relancer un pairing.' });
    } catch (e) {
        console.error('❌ [reset]', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ ok: true, bot: 'SALGA-XMD', sessions: Object.keys(sessions).length, uptime: process.uptime() });
});

// ═══════════════════════════════════════════════════════════
// 🛡️ DASHBOARD ADMIN — protégé par mot de passe (.env: ADMIN_PASSWORD)
// ═══════════════════════════════════════════════════════════
const crypto = require('crypto');
const { isInMaintenance, setMaintenanceMode } = require('./commands/maintenance');
const { performUpdate } = require('./commands/update');

const adminTokens = new Map(); // token -> expiry (ms)
const ADMIN_TOKEN_TTL = 12 * 60 * 60 * 1000; // 12h
const MODE_FILE = path.join(__dirname, 'data', 'messageCount.json');

function parseCookies(req) {
    const header = req.headers.cookie;
    const out = {};
    if (!header) return out;
    header.split(';').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    });
    return out;
}

function requireAdmin(req, res, next) {
    const token = parseCookies(req).admin_token;
    const expiry = token && adminTokens.get(token);
    if (!expiry || Date.now() > expiry) {
        return res.status(401).json({ error: 'Non authentifié.' });
    }
    adminTokens.set(token, Date.now() + ADMIN_TOKEN_TTL); // prolonge la session active
    next();
}

function readMode() {
    try {
        const d = JSON.parse(fs.readFileSync(MODE_FILE));
        return typeof d.isPublic === 'boolean' ? d.isPublic : true;
    } catch { return true; }
}
function writeMode(isPublic) {
    let d = {};
    try { d = JSON.parse(fs.readFileSync(MODE_FILE)); } catch {}
    d.isPublic = isPublic;
    fs.mkdirSync(path.dirname(MODE_FILE), { recursive: true });
    fs.writeFileSync(MODE_FILE, JSON.stringify(d, null, 2));
}

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body || {};
    const real = process.env.ADMIN_PASSWORD;
    if (!real) return res.status(500).json({ error: "ADMIN_PASSWORD n'est pas configuré dans le .env du serveur." });
    if (!password || password !== real) return res.status(401).json({ error: 'Mot de passe incorrect.' });

    const token = crypto.randomBytes(32).toString('hex');
    adminTokens.set(token, Date.now() + ADMIN_TOKEN_TTL);
    res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; Max-Age=${ADMIN_TOKEN_TTL / 1000}; SameSite=Lax`);
    res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
    const token = parseCookies(req).admin_token;
    if (token) adminTokens.delete(token);
    res.setHeader('Set-Cookie', 'admin_token=; Path=/; Max-Age=0');
    res.json({ ok: true });
});

app.get('/api/admin/status', requireAdmin, (req, res) => {
    const sessionList = Object.entries(sessions).map(([id, s]) => ({
        id, status: s.status, number: s.number || null
    }));
    res.json({
        botName: global.botname,
        version: settings.version || '2.0.0',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        isPublic: readMode(),
        maintenance: isInMaintenance(),
        sessions: sessionList
    });
});

app.post('/api/admin/mode', requireAdmin, (req, res) => {
    const { isPublic } = req.body || {};
    if (typeof isPublic !== 'boolean') return res.status(400).json({ error: 'isPublic doit être true ou false.' });
    writeMode(isPublic);
    res.json({ ok: true, isPublic });
});

app.post('/api/admin/maintenance', requireAdmin, (req, res) => {
    const { enabled } = req.body || {};
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled doit être true ou false.' });
    const result = setMaintenanceMode(enabled);
    res.json({ ok: true, maintenance: result });
});

app.post('/api/admin/restart', requireAdmin, (req, res) => {
    res.json({ ok: true, message: 'Redémarrage en cours...' });
    const { scheduleRestart } = require('./commands/update');
    scheduleRestart(1000);
});

let updateState = { step: 'idle', message: '', error: null };

app.post('/api/admin/update', requireAdmin, (req, res) => {
    const { zipUrl } = req.body || {};
    if (!zipUrl || !zipUrl.startsWith('http')) {
        return res.status(400).json({ error: 'zipUrl invalide — colle le lien complet du zip.' });
    }
    if (['downloading', 'extracting', 'replacing'].includes(updateState.step)) {
        return res.status(409).json({ error: 'Une mise à jour est déjà en cours.' });
    }
    const labels = {
        downloading: 'Téléchargement du zip...',
        extracting: 'Extraction des fichiers...',
        replacing: 'Remplacement des anciens fichiers...',
        restarting: 'Redémarrage du bot...'
    };
    updateState = { step: 'downloading', message: labels.downloading, error: null };
    performUpdate(zipUrl, (step) => {
        updateState = { step, message: labels[step] || step, error: null };
    }).catch(err => {
        updateState = { step: 'error', message: err.message, error: err.message };
    });
    res.json({ started: true });
});

app.get('/api/admin/update/status', requireAdmin, (req, res) => {
    res.json(updateState);
});

app.listen(PORT, () => {
    console.log(`🥷 SALGA-XMD — serveur de pairing lancé sur http://localhost:${PORT}`);
    resumeAllSessions().catch(e => console.error('resumeAllSessions error:', e.message));
    startSelfPing();
});

// ── Auto-ping intégré : empêche l'hébergeur (Render, Replit, etc.) de mettre
// le service en veille par inactivité, sans dépendre d'UptimeRobot ou d'un
// cron externe. Utilise l'URL publique fournie automatiquement par Render
// (RENDER_EXTERNAL_URL), ou APP_URL si défini manuellement dans le .env.
function startSelfPing() {
    const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || null;
    if (!selfUrl) {
        console.log('ℹ️ Auto-ping désactivé (aucune URL publique détectée — définis APP_URL dans le .env si besoin).');
        return;
    }
    const axios = require('axios');
    const pingUrl = `${selfUrl.replace(/\/$/, '')}/health`;
    const INTERVAL_MS = 4 * 60 * 1000; // 4 minutes (sous les 15 min d'inactivité de Render Free)

    setInterval(async () => {
        try {
            await axios.get(pingUrl, { timeout: 15000 });
            console.log(`💓 Auto-ping OK (${new Date().toLocaleTimeString('fr-FR')})`);
        } catch (e) {
            console.error('⚠️ Auto-ping échoué:', e.message);
        }
    }, INTERVAL_MS);

    console.log(`💓 Auto-ping activé sur ${pingUrl} (toutes les 4 min)`);
}

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
