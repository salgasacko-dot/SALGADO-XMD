require('dotenv').config();

const settings = {
  packname: process.env.PACK_NAME || 'SALGA-XMD',
  author: process.env.PACK_AUTHOR || 'IB-SACKO',
  botName: process.env.BOT_NAME || 'SALGA-XMD',

  // 👑 Propriétaire officiel du bot
  botOwner: process.env.OWNER_NAME || 'SALGA 🥷',
  ownerNumber: process.env.OWNER_NUMBER || '224662675862',

  // 🛠️ Créateur / développeur du bot (accès total via sudo)
  creatorName: process.env.CREATOR_NAME || 'IB-SACKO',
  creatorNumber: process.env.CREATOR_NUMBER || '224621963059',

  system: process.env.SYSTEM_NAME || 'CENTRAL-HEX',

  prefix: '', // Bot sans préfixe : "menu" suffit
  giphyApiKey: process.env.GIPHY_API_KEY || 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: process.env.COMMAND_MODE || 'public',
  maxStoreMessages: 30,
  storeWriteInterval: 10000,
  description: 'Bot WhatsApp multifonctions - SALGA-XMD',
  version: process.env.BOT_VERSION || '1.0.0',
  ytch: process.env.YT_CHANNEL || '',
  waChannel: process.env.WA_CHANNEL || '',
};

module.exports = settings;

