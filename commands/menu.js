const os = require('os');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const { BOT_IMAGE } = require('../lib/brand');

const MODE_FILE = path.join(__dirname, '../data/messageCount.json');

function getMode() {
    try {
        const d = JSON.parse(fs.readFileSync(MODE_FILE));
        return d.isPublic === false ? 'private' : 'public';
    } catch {
        return 'public';
    }
}

function ramBar() {
    const pct = Math.min(100, Math.round((process.memoryUsage().rss / os.totalmem()) * 100));
    const totalBlocks = 5;
    const filled = Math.max(1, Math.round((pct / 100) * totalBlocks));
    return `${'■'.repeat(filled)}${'□'.repeat(totalBlocks - filled)} ${pct}%`;
}

function heure() {
    return new Date().toLocaleString('fr-FR', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

async function menuCommand(sock, chatId, message) {
    const mode = getMode();

    const caption = `👤 *${settings.creatorName}*
╔══════════════════🥷
║ ⿻ *ʙᴏᴛ ɴᴀᴍᴇ:* ${settings.botName}
║ ⿻ *ᴏᴡɴᴇʀ:* ${settings.botOwner}
║ ⿻ *ᴍᴏᴅᴇ:* ${mode}
║ ⿻ *ʜᴇᴜʀᴇ:* ${heure()}
║ ⿻ *ʀᴀᴍ:* ${ramBar()}
╚══════════════════🥷
╔═〔 🥷𝗦𝗔𝗟𝗚𝗔-𝗠𝗗 〕═❒
║╭─────────────◆
║│      『 𝗠𝗘𝗡𝗨-𝗕𝗢𝗧 』
║╰─────────────◆
╚══════════════════❒
║ ⬡ ➤ menu → Affiche ce menu
║ ⬡ ➤ ping → Vitesse du bot
║ ⬡ ➤ info → Infos sur le bot
║ ⬡ ➤ owner → Contact du propriétaire
║ ⬡ ➤ tagall → Mentionner tout le monde
║ ⬡ ➤ kickall → Expulser tous les membres
║ ⬡ ➤ kick → Expulser un membre
║ ⬡ ➤ song <nom> → Télécharger une musique
║ ⬡ ➤ pair <numéro> → Connexion par code
║ ⬡ ➤ mode public/private → Change le mode
║ ⬡ ➤ open → Ouvrir le groupe
║ ⬡ ➤ close → Fermer le groupe
║ ⬡ ➤ antilink on/off → Bloque les liens
║ ⬡ ➤ welcome on/off → Message de bienvenue
║ ⬡ ➤ waouh → Récupère une vue unique
║ ⬡ ➤ antivv on/off → Anti vue-unique auto
║ ⬡ ➤ sticker / s → Crée un sticker
║ ⬡ ➤ toimg → Sticker → image
║ ⬡ ➤ gpt <question> → Intelligence artificielle
║ ⬡ ➤ humm → Récupère une vue unique
║ ⬡ ➤ antibot on/off → Bloque les autres bots
║ ⬡ ➤ delete → Supprime des messages
║ ⬡ ➤ link on/off → Bloque les liens (rapide)
╚══════════════════════🥷`;

    try {
        await sock.sendMessage(chatId, {
            image: { url: BOT_IMAGE },
            caption
        }, { quoted: message });
    } catch (e) {
        console.error('❌ [menu]', e.message);
        await sock.sendMessage(chatId, { text: caption }, { quoted: message });
    }
}

module.exports = menuCommand;
