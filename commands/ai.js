const axios = require('axios');
const { SYSTEM_NAME } = require('../lib/brand');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

function getPrompt() {
    try {
        const fs = require('fs'), path = require('path');
        const p = path.join(__dirname, '../data/prompt.json');
        return JSON.parse(fs.readFileSync(p)).prompt || "Tu es SALGA-XMD, assistant WhatsApp créé par IB-SACKO. Réponds en français, sois utile et concis.";
    } catch {
        return "Tu es SALGA-XMD, assistant WhatsApp créé par IB-SACKO. Réponds en français, sois utile et concis.";
    }
}

// query : le texte déjà nettoyé (sans le mot déclencheur "gpt")
async function aiCommand(sock, chatId, message, query) {
    try {
        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `╔═════════════════════╗\n║   🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷   ║\n╚═════════════════════╝\n\n🤖 *Usage :* gpt <question>\n💡 _Exemple : gpt C'est quoi Python ?_`
            }, { quoted: message });
        }

        if (!GROQ_API_KEY) {
            return await sock.sendMessage(chatId, {
                text: `❌ *L'IA n'est pas configurée.*\n_Ajoute GROQ_API_KEY dans le fichier .env du serveur._`
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });

        const systemPrompt = getPrompt();
        let answer = null;

        try {
            const r = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'openai/gpt-oss-120b',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: query }
                    ],
                    temperature: 0.7,
                    max_tokens: 800
                },
                { headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 20000 }
            );
            answer = r.data?.choices?.[0]?.message?.content?.trim() || null;
        } catch (e) {
            console.error('❌ [gpt] Groq:', e.response?.data?.error?.message || e.message);
        }

        if (!answer) {
            return await sock.sendMessage(chatId, {
                text: `❌ *L'IA est temporairement indisponible.*\n_Réessayez dans quelques instants._`
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: `╔═════════════════════╗\n║   🥷 *𝗦𝗔𝗟𝗚𝗔-𝗠𝗗* 🥷   ║\n╚═════════════════════╝\n\n❓ *Question :* ${query}\n\n💬 *Réponse :*\n${answer}\n\n> _Propulsé par 🥷 *${SYSTEM_NAME}*_`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        console.error('❌ [gpt]', e.message);
        await sock.sendMessage(chatId, {
            text: `❌ *L'IA est temporairement indisponible.*\n_Réessaie dans quelques instants._`
        }, { quoted: message });
    }
}

module.exports = aiCommand;
