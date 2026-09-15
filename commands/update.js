const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const channelInfo = {
    forwardingScore: 0
};

const UPDATE_IMG = 'https://i.ibb.co/Wvs9SZxF/IMG-20260912-WA0020.jpg';
const ROOT = path.join(__dirname, '..');

// Dossiers/fichiers JAMAIS écrasés par une mise à jour (session WhatsApp, données
// utilisateur, config locale, dépendances) — sinon la mise à jour déconnecterait
// le bot ou effacerait les réglages de chaque groupe.
const PROTECTED = new Set([
    'sessions', 'session', 'data', 'node_modules', '.env', '.git',
    'temp', 'tmp', 'auth_info_baileys'
]);

function copyRecursive(srcDir, destDir) {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        if (PROTECTED.has(entry.name)) continue; // ne jamais toucher aux dossiers protégés
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Si le zip contient un seul dossier racine (cas classique d'un "Download ZIP"
// GitHub, ex: "MonBot-main/"), on redescend dedans pour copier son contenu.
function findRealRoot(extractDir) {
    const entries = fs.readdirSync(extractDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory());
    const files = entries.filter(e => !e.isDirectory());
    if (dirs.length === 1 && files.length === 0) {
        return path.join(extractDir, dirs[0].name);
    }
    return extractDir;
}

// Relance un nouveau process détaché, puis quitte l'ancien.
// Fonctionne en local/VPS. Sur Render/Railway/Koyeb, la plateforme relance
// automatiquement le process dès qu'il se termine.
function scheduleRestart(delayMs = 1500) {
    setTimeout(() => {
        try {
            const child = spawn(process.argv[0], [path.join(ROOT, 'web.js')], {
                cwd: ROOT,
                detached: true,
                stdio: 'inherit',
                env: process.env
            });
            child.unref();
        } catch (e) {
            console.error('❌ Échec du redémarrage automatique:', e.message);
        }
        process.exit(0);
    }, delayMs);
}

// Cœur de la mise à jour : télécharge, extrait, remplace les fichiers.
// Réutilisable depuis WhatsApp (.update) ET depuis le dashboard web (/admin).
// onProgress(step) est appelé à chaque étape : 'downloading' | 'extracting' | 'replacing' | 'restarting'
async function performUpdate(zipUrl, onProgress) {
    let tmpZip, tmpExtract;
    try {
        onProgress?.('downloading');
        const res = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: 200 * 1024 * 1024 });
        tmpZip = path.join(os.tmpdir(), `salga-update-${Date.now()}.zip`);
        fs.writeFileSync(tmpZip, Buffer.from(res.data));

        onProgress?.('extracting');
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(tmpZip);
        tmpExtract = path.join(os.tmpdir(), `salga-update-extract-${Date.now()}`);
        fs.mkdirSync(tmpExtract, { recursive: true });
        zip.extractAllTo(tmpExtract, true);

        onProgress?.('replacing');
        const realRoot = findRealRoot(tmpExtract);
        copyRecursive(realRoot, ROOT);

        fs.rmSync(tmpZip, { force: true });
        fs.rmSync(tmpExtract, { recursive: true, force: true });

        onProgress?.('restarting');
        scheduleRestart(2000);
    } catch (error) {
        try { if (tmpZip) fs.rmSync(tmpZip, { force: true }); } catch {}
        try { if (tmpExtract) fs.rmSync(tmpExtract, { recursive: true, force: true }); } catch {}
        throw error;
    }
}

async function updateCommand(sock, chatId, message, zipUrl) {
    const settings = require('../settings');

    if (!zipUrl) {
        const caption = `╔═════════════════════╗
║   🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷   ║
╠═════════════════════╣
║   🔄 *MISE À JOUR*         ║
╚═════════════════════╝

📦 *Version actuelle :* v${settings.version || '2.0.0'}

🥷────────────────🥷
『 *COMMENT METTRE À JOUR* 』
🥷────────────────🥷

┌─────────────────────
│ Usage : *.update <lien-zip>*
│
│ 1️⃣ Récupère le lien "Download ZIP"
│    de ton dépôt GitHub (bouton vert Code)
│ 2️⃣ Envoie *.update <lien>*
│ 3️⃣ Le bot télécharge, remplace ses
│    fichiers et redémarre tout seul
│
│ 💡 Ou utilise le dashboard : /admin
└─────────────────────

⚠️ Réservé au propriétaire/sudo.
> _Propulsé par 🥷 *CENTRAL-HEX* · CENTRAL HEX_`;
        return await sock.sendMessage(chatId, {
            image: { url: UPDATE_IMG }, caption, contextInfo: channelInfo
        }, { quoted: message });
    }

    try {
        const labels = {
            downloading: '🔄 Téléchargement de la mise à jour...',
            extracting: '📦 Extraction des fichiers...',
            replacing: '♻️ Remplacement des anciens fichiers...',
            restarting: `✅ *Mise à jour terminée !*\n\n🔁 Le bot redémarre maintenant pour appliquer les changements...\n_Reconnexion automatique dans quelques secondes._`
        };
        await performUpdate(zipUrl, (step) => {
            sock.sendMessage(chatId, { text: labels[step], contextInfo: channelInfo }, { quoted: message }).catch(() => {});
        });
    } catch (error) {
        console.error('❌ [update] Erreur:', error.message);
        await sock.sendMessage(chatId, {
            text: `❌ *Échec de la mise à jour :* ${error.message}\n_Aucun fichier n'a été modifié si le téléchargement ou l'extraction a échoué._`,
            contextInfo: channelInfo
        }, { quoted: message });
    }
}

module.exports = updateCommand;
module.exports.performUpdate = performUpdate;
module.exports.scheduleRestart = scheduleRestart;
