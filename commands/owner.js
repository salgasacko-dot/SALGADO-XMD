const settings = require('../settings');
const { BOT_IMAGE, SYSTEM_NAME } = require('../lib/brand');

async function ownerCommand(sock, chatId, message) {
    const creatorVcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${settings.creatorName}\nTEL;waid=${settings.creatorNumber}:${settings.creatorNumber}\nEND:VCARD`;
    const ownerVcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${settings.botOwner}\nTEL;waid=${settings.ownerNumber}:${settings.ownerNumber}\nEND:VCARD`;

    const caption = `┏━━━━━━━━━━━━━━━━━━━━━━┓
┃   🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷   ┃
┗━━━━━━━━━━━━━━━━━━━━━━┛

👑 *PROPRIÉTAIRE DU BOT*
━━━━━━━━━━━━━━━━━━━━━━

🛠️ *LE BOT A ÉTÉ CRÉÉ PAR*
┌─────────────────────
│ 👤 *Nom     :* ${settings.creatorName}
│ 📞 *Contact :* +${settings.creatorNumber}
└─────────────────────

👑 *PROPRIÉTAIRE*
┌─────────────────────
│ 👤 *Nom     :* ${settings.botOwner}
│ 📞 *Contact :* +${settings.ownerNumber}
└─────────────────────

🏷️ *DANS LE SYSTÈME*
┌─────────────────────
│ 💎 *${SYSTEM_NAME}*
└─────────────────────

━━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot     :* ${settings.botName}
📦 *Version :* v${settings.version}

📲 *Contacte-nous ci-dessous* 👇

> _Propulsé par 🥷 *${SYSTEM_NAME}*_`;

    try {
        await sock.sendMessage(chatId, {
            image: { url: BOT_IMAGE },
            caption
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            contacts: { displayName: settings.creatorName, contacts: [{ vcard: creatorVcard }] }
        });

        await sock.sendMessage(chatId, {
            contacts: { displayName: settings.botOwner, contacts: [{ vcard: ownerVcard }] }
        });
    } catch (e) {
        console.error('❌ [owner]', e.message);
        await sock.sendMessage(chatId, { text: caption }, { quoted: message });
    }
}

module.exports = ownerCommand;
