// Close → Ferme le groupe (seuls les admins peuvent envoyer)
const isAdmin = require('../lib/isAdmin');

const channelInfo = {
    forwardingScore: 0
};

async function closeCommand(sock, chatId, senderId, message) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ *Uniquement dans les groupes !*', contextInfo: channelInfo }, { quoted: message });
    }


    try {
        // Verrouille le groupe : seuls les admins peuvent envoyer
        await sock.groupSettingUpdate(chatId, 'announcement');
        const meta = await sock.groupMetadata(chatId);

        await sock.sendMessage(chatId, {
            image: { url: 'https://i.ibb.co/Wvs9SZxF/IMG-20260912-WA0020.jpg' },
            caption: `╔═══════════════════════╗\n║  🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷  ║\n╠═══════════════════════╣\n║   🔒 *GROUPE FERMÉ*      ║\n╚═══════════════════════╝\n\n👥 *${meta.subject}*\n\n┌──────────────────────\n│ 🔒 Statut : *Fermé*\n│ 👑 Seuls les admins peuvent écrire\n│ 📅 Fermé par @${senderId.split('@')[0]}\n└──────────────────────\n\n> _Pour rouvrir : .open_\n> _Propulsé par 🥷 CENTRAL-HEX_`,
            mentions: [senderId],
            contextInfo: channelInfo
        }, { quoted: message });
    } catch (e) {
        console.error('❌ [close]', e.message);
        await sock.sendMessage(chatId, { text: '❌ *Impossible de fermer le groupe.*\n_Vérifiez les permissions du bot._', contextInfo: channelInfo }, { quoted: message });
    }
}

module.exports = closeCommand;
