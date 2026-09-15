const settings = require('../settings');

async function isAdmin(sock, chatId, senderId) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return { isSenderAdmin: false, isBotAdmin: false };
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        if (!groupMetadata || !groupMetadata.participants) {
            return { isSenderAdmin: false, isBotAdmin: false };
        }

        const participants = groupMetadata.participants;

        // Nettoyer les IDs
        const botRawId = sock.user?.id || '';
        const botNumeric = botRawId.split(':')[0].split('@')[0];
        const botLidRaw = sock.user?.lid || '';
        const botLidNumeric = botLidRaw.split(':')[0].split('@')[0];
        const ownerNumeric = (settings.ownerNumber || '').split(':')[0].split('@')[0];

        const senderNumeric = senderId.split(':')[0].split('@')[0];

        // Fonction pour vérifier si un participant correspond au bot
        //
        // ⚠️ Depuis le passage de WhatsApp au système "LID", un participant
        // de groupe n'a JAMAIS ses deux identifiants (numéro de téléphone ET
        // LID) sur les mêmes champs en même temps :
        //   - Si p.id est un LID  → le numéro de téléphone est dans p.phoneNumber
        //   - Si p.id est un numéro → le LID est dans p.lid
        // Ne vérifier que p.id et p.lid (sans p.phoneNumber) fait rater tous
        // les groupes qui fonctionnent en mode LID — c'était le bug qui
        // faisait dire "Réservé aux admins" à de vrais admins.
        function isBotParticipant(p) {
            const pId = (p.id || '').split(':')[0].split('@')[0];
            const pLid = (p.lid || '').split(':')[0].split('@')[0];
            const pPhone = (p.phoneNumber || '').split(':')[0].split('@')[0];
            return (
                pId === botNumeric ||
                pId === ownerNumeric ||
                pPhone === botNumeric ||
                pPhone === ownerNumeric ||
                (botLidNumeric && (pLid === botLidNumeric || pId === botLidNumeric))
            );
        }

        // Fonction pour vérifier si un participant correspond à l'expéditeur
        function isSenderParticipant(p) {
            const pId = (p.id || '').split(':')[0].split('@')[0];
            const pLid = (p.lid || '').split(':')[0].split('@')[0];
            const pPhone = (p.phoneNumber || '').split(':')[0].split('@')[0];
            return (
                p.id === senderId ||
                p.lid === senderId ||
                p.phoneNumber === senderId ||
                pId === senderNumeric ||
                pLid === senderNumeric ||
                pPhone === senderNumeric
            );
        }

        const senderParticipant = participants.find(isSenderParticipant);
        const botParticipant = participants.find(isBotParticipant);

        const isSenderAdmin = senderParticipant
            ? (senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin')
            : false;

        // Si le bot = owner = même numéro, le bot est admin si le sender est admin
        const isBotAdmin = botParticipant
            ? (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin')
            : (senderNumeric === ownerNumeric && isSenderAdmin); // fallback si même compte

        return { isSenderAdmin, isBotAdmin };

    } catch (err) {
        console.error('❌ Error in isAdmin:', err);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = isAdmin;
