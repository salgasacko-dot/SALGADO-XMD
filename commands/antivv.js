// antivv.js — SALGA-XMD
// Active/désactive la récupération AUTOMATIQUE des médias "vue unique"
// envoyés dans le chat. Quand c'est activé, le bot renvoie automatiquement
// tout média vue-unique reçu vers le MP du propriétaire, sans qu'il soit
// nécessaire de répondre manuellement avec waouh/humm.
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const settings = require('../settings');
const { BOT_IMAGE, SYSTEM_NAME } = require('../lib/brand');

const ANTIVV_FILE = path.join(__dirname, '../data/antivv.json');

function readState() {
    try { return JSON.parse(fs.readFileSync(ANTIVV_FILE)); } catch { return {}; }
}
function saveState(s) {
    fs.writeFileSync(ANTIVV_FILE, JSON.stringify(s, null, 2));
}
function isAntivvEnabled(chatId) {
    return readState()[chatId] === true;
}

async function antivvCommand(sock, chatId, message, args) {
    const state = readState();
    const action = Array.isArray(args) ? args[0]?.toLowerCase() : args?.toLowerCase();
    const current = state[chatId] ? '🟢 Activé' : '🔴 Désactivé';

    if (!action) {
        return await sock.sendMessage(chatId, {
            image: { url: BOT_IMAGE },
            caption: `╔═════════════════════╗\n║   🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷   ║\n╠═════════════════════╣\n║   👁️ *ANTI VUE-UNIQUE*     ║\n╚═════════════════════╝\n\n📊 *Statut :* ${current}\n\n📌 *Commandes :*\n┌─────────────────────\n│ ⬡ antivv on\n│ ⬡ antivv off\n└─────────────────────\n\n👁️ *Fonctionnement :*\n┌─────────────────────\n│ Quand activé, tout média\n│ vue-unique envoyé ici est\n│ automatiquement récupéré\n│ et renvoyé au propriétaire.\n└─────────────────────\n\n> _Propulsé par 🥷 *${SYSTEM_NAME}*_`
        }, { quoted: message });
    }

    if (action === 'on') {
        state[chatId] = true;
        saveState(state);
        return await sock.sendMessage(chatId, {
            text: `╔═════════════════════╗\n║   🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷   ║\n╚═════════════════════╝\n\n👁️ *Anti Vue-Unique :* 🟢 Activé`
        }, { quoted: message });
    }

    if (action === 'off') {
        state[chatId] = false;
        saveState(state);
        return await sock.sendMessage(chatId, {
            text: `╔═════════════════════╗\n║   🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷   ║\n╚═════════════════════╝\n\n👁️ *Anti Vue-Unique :* 🔴 Désactivé`
        }, { quoted: message });
    }

    return await sock.sendMessage(chatId, { text: '❌ Usage : antivv on / antivv off' }, { quoted: message });
}

// Extrait le média vue-unique s'il y en a un dans le message
function extractViewOnce(msgContent) {
    if (!msgContent) return null;
    const unwrapped =
        msgContent.viewOnceMessageV2?.message ||
        msgContent.viewOnceMessageV2Extension?.message ||
        msgContent.viewOnceMessage?.message ||
        msgContent;

    if (unwrapped.imageMessage && (unwrapped.imageMessage.viewOnce || msgContent.viewOnceMessageV2 || msgContent.viewOnceMessage)) {
        return { type: 'image', content: unwrapped.imageMessage };
    }
    if (unwrapped.videoMessage && (unwrapped.videoMessage.viewOnce || msgContent.viewOnceMessageV2 || msgContent.viewOnceMessage)) {
        return { type: 'video', content: unwrapped.videoMessage };
    }
    return null;
}

// Appelé sur CHAQUE message reçu dans un chat où antivv est activé
async function handleAntivvCapture(sock, chatId, message) {
    try {
        if (!isAntivvEnabled(chatId)) return false;
        const viewOnce = extractViewOnce(message.message);
        if (!viewOnce) return false;

        const { type, content } = viewOnce;
        const stream = await downloadContentFromMessage(content, type);
        let buf = Buffer.from([]);
        for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);

        const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
        const senderId = message.key.participant || message.key.remoteJid;

        await sock.sendMessage(ownerJid, {
            [type]: buf,
            caption: `👁️ *ANTI VUE-UNIQUE*\n👤 De : @${senderId.split('@')[0]}\n💬 Chat : ${chatId}`,
            mentions: [senderId]
        });
        return true;
    } catch (e) {
        console.error('❌ [antivv]', e.message);
        return false;
    }
}

module.exports = { antivvCommand, isAntivvEnabled, handleAntivvCapture };
