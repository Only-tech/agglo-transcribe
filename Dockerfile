FROM node:20-slim AS builder

# Dépendances système nécessaires
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg

WORKDIR /app

# Installe les dépendances Node
COPY package*.json ./
RUN npm install

# Copie le reste du code
COPY . .

# App Next.js pour la production
RUN npm run build


# -----------------------------
# Image "Runner" - exécution
# -----------------------------
FROM node:20-slim

# Dépendances d'exécution
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Fichiers de build de l'étape "builder"
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copie le script Python
COPY --from=builder /app/transcribe.py ./transcribe.py
COPY --from=builder /app/requirements.txt ./requirements.txt

# Installe uniquement les dépendances de prod
RUN npm install --production

# Crée et installe les dépendances Python
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# Pré-télécharge le modèle Whisper pendant la construction de l'image
RUN python3 -c "import whisper; whisper.load_model('medium')"

EXPOSE 3000

CMD ["npm", "start"]
