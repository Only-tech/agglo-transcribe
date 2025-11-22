# 🎙️ Transcripteur Audio & Gestion de Réunions

Cette application web combine **transcription audio en temps réel** (via OpenAI Whisper) et **gestion collaborative de réunions** (via pgAdmin et NextAuth).  
Elle permet de créer/rejoindre des réunions, d’enregistrer et transcrire l’audio, puis de générer des résumés automatiques grâce à l’IA.

---

## Fonctionnalités

- **Transcription en direct** depuis un fichier audio (Whisper + FFmpeg).
- **Transcription en direct + live** depuis le micro (choix de la fréquence d'enregistrement, Whisper + FFmpeg).
- **Gestion des réunions** : création, participation, historique et suppression depuis le Dashboard (Le bouton "Lancer" ou "Rejoindre" apparaît selon le champ rempli).
- **Authentification sécurisée** avec NextAuth (credentials).
- **Base de données PostgreSQL pgAdmin** pour stocker les réunions, transcriptions, participants et analyses.
- **Analyse IA (Ollama)** pour générer résumés, thèmes et actions à partir des transcriptions.
- **Export & partage** : copier, télécharger, ou envoyer par e‑mail les transcriptions et résumés.
- **Interface moderne** avec Next.js 15, React, TypeScript et Tailwind CSS -> full responsive.

---

## Technologies Utilisées

### Frontend

- **Next.js 15 (App Router)**
- **React + TypeScript**
- **Tailwind CSS**
- **NextAuth** pour l’authentification

### Backend

- **Next.js API Routes**
- **pgAdmin (PostgreSQL)** pour la persistance des données, gestion des transcripts et stockage
- **Python + Whisper** pour la transcription audio
- **FFmpeg** pour la conversion audio
- **Ollama IA** pour l’analyse et le résumé
- **Docker** pour la portabilité de l'application

---

### Structure du Projet

L'architecture du projet est organisée pour séparer clairement les responsabilités entre le client, le serveur et les scripts d'IA.

```bash
agglo-transcripteur/
├── .next/                                  # Dossier de build de Next.js
├── node_modules/                           # Dépendances JavaScript
├── public/                                 # Fichiers statiques
├── src/
│   ├── app/
│   │   ├── api/                            # Fichiers métiers
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts            # Authentification
│   │   │   ├── transcribe/
│   │   │   │   ├── chunk/
│   │   │   │   │   └── route.ts            # Traitement des bouts audio
│   │   │   │   ├── demo/
│   │   │   │   │   └── route.ts            # Transcrition depuis Interface principale
│   │   │   │   └──  file/
│   │   │   │       └── route.ts            # Transcription fichier audio
│   │   │   └── meetings/
│   │   │       ├── [id]
│   │   │       │   ├── analyze/
│   │   │       │   │   └── route.ts        # Analyse transcritpion
│   │   │       │   ├── entries/
│   │   │       │   │   ├── [entryId]/
│   │   │       │   │   │   └── route.ts    # Enregistre transcritpion dans la base de données
│   │   │       │   │   └── route.ts        # Enregistre transcritpion
│   │   │       │   ├── finalize/
│   │   │       │   │   └── route.ts        # Envoie la transcritpion au participants
│   │   │       │   ├── join/
│   │   │       │   │   └── route.ts        # Rejoindre la réunion
│   │   │       │   └── participants/
│   │   │       │      └── route.ts         # Participants
│   │   │       ├── history/
│   │   │       │   └── route.ts            # Historique des réunions
│   │   │       └── route.tsx               # Englobe les meetings
│   │   ├── lib/
│   │   │   ├── aiService.ts                # Utile pour l'analyse avec l'IA
│   │   │   ├── audioProcessing.ts          # Transcription
│   │   │   ├── db.ts                       # Assure la liéson prisma base de données
│   │   │   └── auth/options.ts             # Eléments de connexions
│   │   ├── ui/                             # Composants
│   │   │   ├── AuthStatus.tsx              # Statut d'authentification
│   │   │   ├── ActionBars.tsx              # Englobant les actions boutons
│   │   │   ├── ConfirmationModal.tsx       # Modale pour confirmation lors d'une suppression
│   │   │   ├── EmailForm.tsx               # formulaire pour enregistrer le mail (il n'est pas utilisé ici)
│   │   │   ├── FloatingLabelInput.tsx      # label et input réutilisable
│   │   │   ├── Icons.tsx                   # SVG des microphones
│   │   │   ├── AuthStatus.tsx              # Statut d'authentification
│   │   │   ├── Loader.tsx                  # Animation barre et points
│   │   │   ├── Spinner.tsx                 # Animation cercle
│   │   │   ├── ThemeToggle.tsx             # Changer le thème couleur
│   │   │   ├── AuthStatus.tsx              # Statut d'authentification
│   │   │   ├── TranscriptionDisplay.tsx    # Composants UI du bouton micro
│   │   │   └── logo/
│   │   │       └── AggloTranscribe.tsx     # Logo Agglo Transcription
│   │   ├── register/
│   │   │   └── page.tsx                    # Interface d'inscription
│   │   ├── login/
│   │   │   └── page.tsx                    # Interface de connexion
│   │   ├── meetings/
│   │   │   └── [id]
│   │   │       ├── page.tsx                # Interface de réunion, transcription et analyse
│   │   │       └── MeetingPage.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx                    # Tableau de bord utilisateur
│   │   ├── globals.css                     # Styles globaux
│   │   ├── layout.tsx                      # Layout racine de l'application
│   │   ├── providers.tsx
│   │   └── page.tsx                        # Interface principale
├── types/
│    └── next-auth.d.ts            # Extension des types
├── whisper.cpp/                   # Dossiers whisper
├── .gitignore                     # Fichiers et dossiers à ignorer par Git
├── .dockerignore                  # Fichiers et dossiers à ignorer par Git
├── package.json                   # Dépendances et scripts du projet Node.js
├── README.md                      # Ce fichier
├── requirements.txt               # OpenAI Whisper
├── Dockerfile                     # Script d'installation de l'application et des dépendances des langages utilisés
├── Dockerfile.ollama              # Script d'installation du service IA ollama
├── docker-compose.yml             # Configuration du conteneur et de l'environement de l'application
├── init.sql                       # Tables base de données
├── entrypoint.sh                  # Utile à l'installation de ollama IA
├── LICENSE.md                     # Licence du projet
├── transcribe.py                  # Script Python qui utilise Whisper pour la transcription
├── middleware.ts                  # Protection des routes sensibles
└── tsconfig.json                  # Configuration TypeScript
```

---

### Démarrage Rapide

Suivez ces étapes pour lancer le projet sur votre machine locale.

#### Prérequis

Assurez-vous d'avoir **Docker** installé et accessible depuis votre terminal ou vscode.

#### Étapes d'Installation

- **Clonez le dépôt du projet**

```bash
git clone https://github.com/Only-tech/agglo-transcribe.git
cd agglo-transcribe
```

---

## Variables d’Environnement

Créez un fichier `.env.local` à la racine avec :

```bash
# Base de données PostgreSQL pgAdmin
DATABASE_URL="postgresql://dbcontainer:password@host:5432/dbname"

# NextAuth
NEXTAUTH_SECRET="clé_secrète"
NEXTAUTH_URL="http://localhost:3000", le domaine si production

# Pour les résumés IA
OLLAMA_API_URL="..."

# Configuration transporteur
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="votre.email@gmail.com"
SMTP_PASS="votre-mot-de-passe-d-application"
```

2. NextAuth
   Générez une clé secrète :

```bash
openssl rand -base64 32
```

Ajoutez-la dans .env.local :

```bash
NEXTAUTH_SECRET="clé_générée"
NEXTAUTH_URL="http://localhost:3000"
```

- **Installez le projets, ses langages, ses dépendances**

Regardez les fichiers _Dockerfile_, _Dockerfile.ollama_ et _docker-compose.yml_

(Le script Dockerfile va automatiser l'installation de Node.js, Python, whisper,Ollama, ffmpeg, et toutes leurs dépendances, l'application sera lancée à la fin de l'installation)

```bash
docker compose up --build
```

---

FFmpeg
Installe FFmpeg localement :

macOS : brew install ffmpeg

Linux : sudo apt install ffmpeg

Windows : ffmpeg.org/download.html

Vérifie l’installation :

```bash
ffmpeg -version
```

---

NB: Au besoin vous pouvez installer les dépendances node.js en entrant la commande ci dessous si besoin de modifier immédiatement le ux, mais ces dépendances seront déjà présentes dans le conteneur Docker.

```bash
npm install
```

_Lancez l'application_

```bash
docker-compose up
```

Ouvrez http://localhost:3000 dans votre navigateur pour commencer à utiliser l'application (port 3000 exposé dans la configuration docker).

---

### Auteur

Cédrick FEUMEGNE.

---

## Licence

Ce projet est sous licence.

Voir le fichier LICENSE (/LICENSE.md) pour plus de détails.
