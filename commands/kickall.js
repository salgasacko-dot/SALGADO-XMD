const isAdmin = require('../lib/isAdmin');

async function kickallCommand(sock, chatId, senderId, message) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, {
            text: `❌ *Commande réservée aux admins !*\nSeuls les admins peuvent utiliser *kickall*`
        }, { quoted: message });
        return;
    }

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, {
            text: `❌ *Le bot doit être admin pour utiliser cette commande !*`
        }, { quoted: message });
        return;
    }

    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];

        // Récupérer les admins du groupe
        const admins = participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);

        // Récupérer l'ID du bot
        const botId = sock.user?.id || '';
        const botPhoneNumber = botId.includes(':') ? botId.split(':')[0] : botId.split('@')[0];
        const botIdFormatted = botPhoneNumber + '@s.whatsapp.net';

        // Membres à expulser = tous sauf admins et le bot
        const membersToKick = participants
            .filter(p => {
                const pPhone = p.id.split('@')[0].split(':')[0];
                const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                const isBot = p.id === botIdFormatted || pPhone === botPhoneNumber;
                return !isAdmin && !isBot;
            })
            .map(p => p.id);

        if (membersToKick.length === 0) {
            await sock.sendMessage(chatId, {
                text: `⚠️ *Aucun membre à expulser !*\nTous les membres sont déjà admins.`
            }, { quoted: message });
            return;
        }

        // Message d'avertissement avant l'action
        await sock.sendMessage(chatId, {
            text: `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   🚫 *KICKALL ACTIVÉ* 🚫   ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

⚡ *Hard Reset du groupe en cours...*

👥 Membres à expulser : *${membersToKick.length}*
👑 Admins conservés : *${admins.length}*

⏳ Opération en cours...`
        }, { quoted: message });

        // Expulser par batch de 5 pour éviter les limites WhatsApp
        const batchSize = 5;
        let kicked = 0;

        for (let i = 0; i < membersToKick.length; i += batchSize) {
            const batch = membersToKick.slice(i, i + batchSize);
            try {
                await sock.groupParticipantsUpdate(chatId, batch, 'remove');
                kicked += batch.length;
                // Petit délai pour éviter le ban
                await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                console.error('Batch kick error:', err);
            }
        }

        // Message final
        await sock.sendMessage(chatId, {
            text: `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   ✅ *KICKALL TERMINÉ* ✅   ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

🗑️ *${kicked} membres expulsés*
👑 *Admins conservés*

🔄 Le groupe repart à zéro !
⚠️ Les membres ne peuvent plus rejoindre sauf invitation.

> _Powered by SALGA-XMD · CENTRAL-HEX_`
        });

    } catch (error) {
        console.error('Error in kickall command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *Erreur lors du kickall !*\nVérifie que le bot est bien admin.`
        }, { quoted: message });
    }
}

module.exports = kickallCommand;
