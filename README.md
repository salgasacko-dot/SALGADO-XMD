# 🥷 SALGA-XMD

Bot WhatsApp multi-device **sans préfixe** — tape simplement le nom d'une commande (ex. `menu`, `ping`, `owner`) et le bot répond directement.

Créé par **IB-SACKO** · Propriétaire **SALGA 🥷** · Système **CENTRAL-HEX**

📢 Rejoindre la communauté : https://whatsapp.com/channel/0029VbC8YkY7oQhiOiiSpy1z

---

## ⚡ Connexion (aucune installation pour l'utilisateur final)

1. Déploie le bot sur ton propre serveur/hébergeur Node.js (voir plus bas).
2. Ouvre la page d'accueil (`/`) servie par `web.js`.
3. Entre ton numéro WhatsApp (avec l'indicatif pays) et clique sur **Obtenir le code**, ou choisis l'onglet **QR Code**.
4. Sur ton téléphone : WhatsApp → ⋮ → Appareils liés → Lier un appareil → Lier avec un numéro de téléphone → entre le code (ou scanne le QR).
5. C'est prêt : tape `menu` dans n'importe quelle conversation.

## 📋 Les 23 commandes

| Commande | Description |
|---|---|
| `menu` | Affiche le menu illustré du bot |
| `ping` | Vitesse de réponse du bot |
| `info` | Informations sur le bot |
| `owner` | Contact du créateur et du propriétaire |
| `tagall` | Mentionne tous les membres du groupe |
| `kickall` | Expulse tous les membres (admin) |
| `kick` | Expulse un membre mentionné (admin) |
| `song <nom>` | Télécharge une musique depuis YouTube |
| `pair <numéro>` | Génère un code de connexion depuis WhatsApp |
| `mode public/private` | Change le mode d'accès au bot (propriétaire) |
| `open` | Ouvre le groupe (tout le monde peut écrire) |
| `close` | Ferme le groupe (admins seulement) |
| `antilink on/off` | Supprime automatiquement les liens |
| `link on/off` | Alternative rapide au blocage de liens |
| `welcome` | Message de bienvenue pour les nouveaux membres |
| `waouh` | Récupère un média vue-unique (en réponse) |
| `humm` | Récupère un média vue-unique (en réponse) |
| `antivv on/off` | Récupère automatiquement tous les médias vue-unique du chat |
| `sticker` / `s` | Transforme une image/vidéo en sticker |
| `toimg` | Transforme un sticker en image |
| `gpt <question>` | Assistant IA conversationnel |
| `antibot on/off` | Bloque les messages des autres bots (admin) |
| `delete` / `del` | Supprime des messages récents (admin) |

## 🛡️ Dashboard admin

Accessible sur `/admin` (mot de passe défini par `ADMIN_PASSWORD` dans `.env`) :
- État de connexion, mémoire, uptime, version
- Basculer mode public/privé et mode maintenance
- Liste des sessions WhatsApp connectées
- Redémarrage du bot
- Mise à jour du code depuis un lien ZIP (ex. "Download ZIP" GitHub)

## ⚙️ Installation

```bash
git clone <ton-dépôt>
cd SALGA-XMD
npm install
cp .env.example .env   # puis renseigne ADMIN_PASSWORD et GROQ_API_KEY si besoin
node web.js
```

Le serveur démarre sur le port `3000` (configurable via `PORT`). Ouvre `http://localhost:3000` pour connecter un numéro.

### Déploiement (Docker / Railway / Koyeb)

Le projet inclut un `Dockerfile`, un `railway.toml` et un `koyeb.yaml` prêts à l'emploi si tu préfères déployer sur une plateforme plutôt qu'en local — mais ce n'est pas obligatoire : le bot fonctionne aussi bien sur un simple VPS ou en local avec `node web.js`.

## 🔧 Configuration (`.env`)

| Variable | Rôle |
|---|---|
| `OWNER_NUMBER` / `OWNER_NAME` | Numéro et nom du propriétaire |
| `CREATOR_NUMBER` / `CREATOR_NAME` | Numéro et nom du créateur |
| `ADMIN_PASSWORD` | Mot de passe du dashboard `/admin` |
| `GROQ_API_KEY` | Clé API pour la commande `gpt` (gratuite sur console.groq.com) |
| `COMMAND_MODE` | `public` ou `private` par défaut |

## 👤 Créateur & Communauté

- 🛠️ Créateur : **IB-SACKO** — +224 621 963 059
- 👑 Propriétaire : **SALGA 🥷** — +224 662 675 862
- 💎 Système : **CENTRAL-HEX**
- 📢 Chaîne WhatsApp : https://whatsapp.com/channel/0029VbC8YkY7oQhiOiiSpy1z

---

<div align="center">Propulsé par 🥷 <b>CENTRAL-HEX</b></div>
 
