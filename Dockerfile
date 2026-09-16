# ── SALGA-XMD — Image Docker unique pour Render / Railway / Koyeb ──
FROM node:20-bookworm-slim

# Dépendances système : ffmpeg (conversion média), libs pour sharp/canvas, git
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    build-essential \
    libvips-dev \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installe les dépendances Node d'abord (meilleur cache Docker)
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Copie le reste du projet
COPY . .

# Dossiers de session/temp créés au runtime, montés en volume persistant
RUN mkdir -p sessions session temp

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "--max-old-space-size=460", "--optimize-for-size", "web.js"]
