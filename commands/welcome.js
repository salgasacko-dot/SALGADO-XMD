const { handleWelcome } = require('../lib/welcome');
const { getWelcome } = require('../lib/index');
const { channelInfo } = require('../lib/messageConfig');
const store = require('../lib/lightweight_store');

async function welcomeCommand(sock, chatId, message, match) {
    // Check if it's a group
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne fonctionne que dans les groupes.' });
        return;
    }

    // Extract match from message
    const text = message.message?.conversation || 
                message.message?.extendedTextMessage?.text || '';
    const matchText = text.split(' ').slice(1).join(' ');

    await handleWelcome(sock, chatId, message, matchText);
}

async function handleJoinEvent(sock, id, participants) {
    // ✅ Le message de bienvenue est actif par défaut dans tous les groupes,
    // plus besoin de taper .welcome on.

    // Get custom welcome message
    const customMessage = await getWelcome(id);

    // Get group metadata
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;
    const groupDesc = groupMetadata.desc || 'Aucune description';

    // Send welcome message for each new participant
    for (const participant of participants) {
        const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
        const user = participantString.split('@')[0];

        try {
            // ── Récupère le vrai nom du contact (pas getBusinessProfile,
            // qui ne fonctionne que pour les comptes WhatsApp Business) ──
            let displayName = user; // par défaut : le numéro
            const savedContact = store.contacts?.[participantString];
            if (savedContact?.name) {
                displayName = savedContact.name;
            } else {
                const groupParticipants = groupMetadata.participants;
                const userParticipant = groupParticipants.find(p => p.id === participantString);
                if (userParticipant?.notify || userParticipant?.name) {
                    displayName = userParticipant.notify || userParticipant.name;
                }
            }

            // Process custom message with variables
            let finalMessage;
            if (customMessage) {
                finalMessage = customMessage
                    .replace(/{user}/g, `@${displayName}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{description}/g, groupDesc);
            } else {
                finalMessage = `╭━━━⊰🎉⊱━━━╮
   *BIENVENUE !*
╰━━━⊰🎉⊱━━━╯

Salut @${displayName} 👋

On est super content de t'accueillir dans *${groupName}* ! 🥳

📋 *À propos du groupe :*
${groupDesc}

👥 Vous êtes maintenant *${groupMetadata.participants.length}* membres.

N'hésite pas à te présenter avec une photo de toi 📸

❥ Prénom : 
❥ Nom : 
❥ Âge : 
❥ Situation : 
❥ Niveau : 
❥ Boulot : 

CENTRAL-HEX`;
            }

            // ── Récupère la vraie photo de profil de la personne ──
            let profilePicUrl = null;
            try {
                profilePicUrl = await sock.profilePictureUrl(participantString, 'image');
            } catch (profileError) {
                // Pas de photo de profil publique (ou compte trop récent) : on utilisera juste du texte
            }

            if (profilePicUrl) {
                await sock.sendMessage(id, {
                    image: { url: profilePicUrl },
                    caption: finalMessage,
                    mentions: [participantString],
                    ...channelInfo
                });
            } else {
                await sock.sendMessage(id, {
                    text: finalMessage,
                    mentions: [participantString],
                    ...channelInfo
                });
            }
        } catch (error) {
            console.error('Error sending welcome message:', error);
            // Fallback ultra simple en cas d'erreur inattendue
            try {
                await sock.sendMessage(id, {
                    text: `Bienvenue @${user} dans ${groupName} ! 🎉`,
                    mentions: [participantString],
                    ...channelInfo
                });
            } catch (e2) {
                console.error('Fallback welcome message also failed:', e2);
            }
        }
    }
}

module.exports = { welcomeCommand, handleJoinEvent };
