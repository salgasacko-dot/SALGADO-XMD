// Link → Bloque tous les liens dans le groupe (différent de antilink déjà existant)
// Cette commande est le toggle rapide du système antilink
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

const channelInfo = {
    forwardingScore: 0
};

async function linkCommand(sock, chatId, senderId, args, message) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ *Uniquement dans les groupes !*', contextInfo: channelInfo }, { quoted: message });
    }

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
    if (!isSenderAdmin) {
        return await sock.sendMessage(chatId, {
            text: `╔══════════════════════╗\n║   🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷   ║\n╚══════════════════════╝\n\n❌ *Réservé aux admins !*`,
            contextInfo: channelInfo
        }, { quoted: message });
    }

    const action = args[0]?.toLowerCase();
    const existing = await getAntilink(chatId, 'on');
    const current = existing?.enabled ? '🟢 Activé' : '🔴 Désactivé';

    if (!action) {
        return await sock.sendMessage(chatId, {
            image: { url: 'https://i.ibb.co/Wvs9SZxF/IMG-20260912-WA0020.jpg' },
            caption: `╔═══════════════════════╗\n║  🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷  ║\n╠═══════════════════════╣\n║   🔗 *BLOCAGE DES LIENS*  ║\n╚═══════════════════════╝\n\n📊 *Statut :* ${current}\n\n📌 *Commandes :*\n┌──────────────────────\n│ ⬡ link on  → Bloquer les liens\n│ ⬡ link off → Autoriser les liens\n└──────────────────────\n\n🛡️ *Actions disponibles :*\n┌──────────────────────\n│ • Suppression du message\n│ • Avertissement du membre\n│ • Expulsion du groupe\n└──────────────────────\n\n> _Propulsé par 🥷 CENTRAL-HEX_`,
            contextInfo: channelInfo
        }, { quoted: message });
    }

    if (action === 'on') {
        await setAntilink(chatId, 'on', 'delete');
        return await sock.sendMessage(chatId, {
            text: `╔═══════════════════════╗\n║  🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷  ║\n╚═══════════════════════╝\n\n🔗 *Blocage des liens :* 🟢 Activé\n\n┌──────────────────────\n│ 🚫 Tout lien sera supprimé\n│ ⚠️ Le membre sera averti\n└──────────────────────\n\n> _Pour désactiver : link off_`,
            contextInfo: channelInfo
        }, { quoted: message });
    }

    if (action === 'off') {
        await removeAntilink(chatId, 'on');
        return await sock.sendMessage(chatId, {
            text: `╔═══════════════════════╗\n║  🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷  ║\n╚═══════════════════════╝\n\n🔗 *Blocage des liens :* 🔴 Désactivé\n\n> _Les liens sont maintenant autorisés._`,
            contextInfo: channelInfo
        }, { quoted: message });
    }
}

module.exports = linkCommand;
