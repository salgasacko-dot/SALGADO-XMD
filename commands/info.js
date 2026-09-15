const settings = require('../settings');
const { BOT_IMAGE, SYSTEM_NAME } = require('../lib/brand');

async function infoCommand(sock, chatId, message) {
    const caption = `╔═════════════════════╗
║   🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷   ║
╠═════════════════════╣
║   ℹ️ *INFO BOT*            ║
╚═════════════════════╝

┌─────────────────────
│ 🤖 *Nom      :* ${settings.botName}
│ 📦 *Version  :* v${settings.version}
│ 🛠️ *Créateur :* ${settings.creatorName}
│ 👑 *Owner    :* ${settings.botOwner}
│ 🌍 *Mode     :* ${settings.commandMode === 'private' ? 'Private' : 'Public'}
│ ✅ *Statut   :* En ligne 24/7
│ 🛡️ *Cmds     :* 23 commandes
└─────────────────────

🥷 *Communauté :* ${SYSTEM_NAME}

> _Propulsé par 🥷 *${SYSTEM_NAME}*_`;

    await sock.sendMessage(chatId, {
        image: { url: BOT_IMAGE },
        caption
    }, { quoted: message });
}

module.exports = infoCommand;
