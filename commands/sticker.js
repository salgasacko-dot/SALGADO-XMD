// sticker.js — SALGA-XMD
// Adapté depuis wa-sticker-formatter par CENTRAL-HEX
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const channelInfo = {
    forwardingScore: 0
};

async function stickerCommand(sock, chatId, message) {
    let tempInput, tempOutput;
    try {
        const username = message.pushName || 'SALGA-XMD';

        // ── Cas 1 : réponse à un média ──
        const quotedInfo = message.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = quotedInfo?.quotedMessage;

        // ── Cas 2 : média envoyé directement avec .sticker en légende ──
        const directImage = message.message?.imageMessage;
        const directVideo = message.message?.videoMessage;

        let targetMessage, isVideo, isImage;

        if (quotedMessage && (quotedMessage.imageMessage || quotedMessage.videoMessage)) {
            // Réponse à un média
            isVideo = !!quotedMessage.videoMessage;
            isImage = !!quotedMessage.imageMessage;
            targetMessage = {
                key: {
                    remoteJid: chatId,
                    id: quotedInfo.stanzaId,
                    participant: quotedInfo.participant
                },
                message: quotedMessage
            };
        } else if (directImage || directVideo) {
            // Média envoyé directement avec légende .sticker
            isVideo = !!directVideo;
            isImage = !!directImage;
            targetMessage = message;
        } else {
            return sock.sendMessage(chatId, {
                image: { url: 'https://i.ibb.co/Wvs9SZxF/IMG-20260912-WA0020.jpg' },
                caption: `🥷 *STICKER — SALGA-XMD*\n\n❌ Réponds à une image/vidéo avec *sticker*\nOu envoie une image avec *sticker* en légende !\n\n> 🥷 CENTRAL-HEX`,
                contextInfo: channelInfo
            }, { quoted: message });
        }

        if (!isVideo && !isImage) {
            return sock.sendMessage(chatId, {
                text: '❌ Le message doit être une image ou une vidéo !'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: '⚙️ Conversion en sticker en cours...' }, { quoted: message });

        const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {});
        if (!mediaBuffer) throw new Error('Téléchargement du média échoué');

        // Fichiers temporaires
        const uniqueId = Date.now();
        const tmpDir = path.join(__dirname, '../tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        tempInput = path.join(tmpDir, isVideo ? `video_${uniqueId}.mp4` : `image_${uniqueId}.jpg`);
        tempOutput = path.join(tmpDir, `sticker_${uniqueId}.webp`);
        fs.writeFileSync(tempInput, mediaBuffer);

        if (isVideo) {
            // Conversion vidéo → webp animé avec ffmpeg
            await new Promise((resolve, reject) => {
                exec(
                    `ffmpeg -i "${tempInput}" -vf "scale=512:512:flags=lanczos,fps=15" -c:v libwebp -q:v 50 -preset default -loop 0 -an -vsync 0 -t 10 "${tempOutput}"`,
                    { timeout: 60000 },
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        } else {
            // Conversion image → webp avec ffmpeg
            await new Promise((resolve, reject) => {
                exec(
                    `ffmpeg -i "${tempInput}" -vf "scale=512:512:flags=lanczos" -c:v libwebp -q:v 80 "${tempOutput}"`,
                    { timeout: 30000 },
                    (err) => {
                        if (err) {
                            // Fallback sans ffmpeg
                            exec(`convert "${tempInput}" -resize 512x512 "${tempOutput}"`,
                                { timeout: 20000 },
                                (err2) => { if (err2) reject(err2); else resolve(); }
                            );
                        } else resolve();
                    }
                );
            });
        }

        if (!fs.existsSync(tempOutput)) throw new Error('Conversion échouée');

        const stickerBuffer = fs.readFileSync(tempOutput);

        // Ajouter metadata au sticker (pack/author)
        await sock.sendMessage(chatId, {
            sticker: stickerBuffer,
            contextInfo: channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('❌ Erreur sticker:', error.message);
        await sock.sendMessage(chatId, {
            text: `⚠️ Erreur conversion sticker: ${error.message}`
        }, { quoted: message });
    } finally {
        // Nettoyage fichiers temporaires
        try { if (tempInput && fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch {}
        try { if (tempOutput && fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch {}
    }
}

module.exports = stickerCommand;
