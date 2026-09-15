// lib/brand.js — Constantes d'identité visuelle du bot SALGA-XMD
// Centralise le nom, l'image et le pied de page utilisés par toutes les commandes.

const BOT_NAME = 'SALGA-XMD';
const BOT_TITLE = '𝗦𝗔𝗟𝗚𝗔-𝗠𝗗'; // texte stylé utilisé dans les cadres ASCII
const BOT_IMAGE = 'https://i.ibb.co/Wvs9SZxF/IMG-20260912-WA0020.jpg';

const CREATOR_NAME = 'IB-SACKO';
const CREATOR_NUMBER = '224621963059';

const OWNER_NAME = 'SALGA 🥷';
const OWNER_NUMBER = '224662675862';

const SYSTEM_NAME = 'CENTRAL-HEX';

const FOOTER = `> _Propulsé par 🥷 *${SYSTEM_NAME}*_`;

// Pas de contexte de transfert vers une chaîne WhatsApp externe : on reste neutre.
const channelInfo = {};

module.exports = {
    BOT_NAME,
    BOT_TITLE,
    BOT_IMAGE,
    CREATOR_NAME,
    CREATOR_NUMBER,
    OWNER_NAME,
    OWNER_NUMBER,
    SYSTEM_NAME,
    FOOTER,
    channelInfo
};
