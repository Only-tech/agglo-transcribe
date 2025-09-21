# Transcripteur Audio

Cette application web est conçue pour transcrire l'audio du microphone en temps réel ou à partir d'un fichier, propulsée par l'intelligence artificielle d'OpenAI Whisper.

Elle offre une solution simple et efficace pour convertir la parole en texte, que ce soit lors d'une réunion, d'un mémo vocal ou à partir d'un enregistrement existant.

---

### Fonctionnalités Principales

- **Transcription en Direct** : Capturez l'audio de votre microphone et visualisez la transcription apparaître en temps réel.

- **Import de Fichiers Audio** : Uploadez des fichiers audio (MP3, WAV, M4A, WEBM, etc.) pour obtenir leur transcription complète.

- **Contrôles d'Enregistrement** : Gérez l'enregistrement avec des boutons intuitifs pour démarrer, mettre en pause, reprendre et arrêter.

- **Export Facile** : Copiez la transcription complète dans le presse-papiers ou téléchargez-la au format .txt en un seul clic.

- **Envoi par E-mail** : Entrez votre adresse e-mail pour recevoir la transcription finale directement dans votre boîte de réception.

- **Visualiseur Audio** : Une barre de visualisation élégante réagit en temps réel à l'intensité du son capté par le microphone.

- **Interface Réactive** : Profitez d'une expérience utilisateur fluide et adaptable sur tous les appareils, du mobile à l'ordinateur de bureau.

---

### Technologies Utilisées

**Frontend** :

- _Next.js_ : Framework React pour une application web performante et optimisée.

- _React & TypeScript_ : Pour une interface utilisateur robuste, interactive et typée.

- _Tailwind CSS_ : Pour un design moderne, personnalisé et entièrement responsive.

**Backend & Traitement IA** :

- _Next.js API Routes_ : Pour créer les points d'API côté serveur.

- _Node.js (child_process)_ : Pour orchestrer les scripts externes et gérer les fichiers.

- _Python_ : Langage principal pour l'exécution du modèle d'intelligence artificielle.

- _OpenAI Whisper_ : Modèle de reconnaissance vocale de pointe pour une précision élevée.

- _FFmpeg_ : L'outil indispensable pour la conversion et la normalisation des formats audio.

---

### Structure du Projet

L'architecture du projet est organisée pour séparer clairement les responsabilités entre le client, le serveur et les scripts d'IA.

```bash
agglo-transcripteur/
├── .next/                         # Dossier de build de Next.js
├── .venv/                         # Environnement virtuel Python
├── node_modules/                  # Dépendances JavaScript
├── public/                        # Fichiers statiques
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── transcribe/
│   │   │   │   └── route.ts         # API pour la transcription (gère ffmpeg, appelle Python)
│   │   │   └── send-email/
│   │   │       └── route.ts         # API pour l'envoi d'e-mails
│   │   ├── ui/
│   │   │   └── MicrophoneButton.tsx # Composants UI du bouton micro
│   │   ├── utils/
│   │   │   └── processAudioChunk.ts # Logique client pour envoyer les chunks audio
│   │   ├── globals.css              # Styles globaux
│   │   ├── layout.tsx               # Layout racine de l'application
│   │   └── page.tsx                 # Interface utilisateur principale
├── .gitignore                     # Fichiers et dossiers à ignorer par Git
├── install-whisper.ps1            # Script PowerShell pour l'installation auto sur Windows
├── package.json                   # Dépendances et scripts du projet Node.js
├── README.md                      # Ce fichier
├── Requirements-Document.md       # Cahier des charges du projet
├── LICENSE.md                     # Licence du projet
├── transcribe.py                  # Script Python qui utilise Whisper pour la transcription
└── tsconfig.json                  # Configuration TypeScript
```

---

### Démarrage Rapide

Suivez ces étapes pour lancer le projet sur votre machine locale.

#### Prérequis

Assurez-vous d'avoir les outils suivants installés et accessibles depuis votre terminal (dans le PATH système), plus de détails à la fin de ce README :

Node.js (v18.+)

Python (v3.+)

FFmpeg (Ceci est crucial pour la conversion audio !)

#### Étapes d'Installation

- **Clonez le dépôt du projet**

```bash
git clone [https://github.com/Only-tech/agglo-transcribe.git](https://github.com/Only-tech/agglo-transcribe.git)
cd agglo-transcribe
```

- **Installez les dépendances JavaScript**

```bash
npm install ou yarn
```

- **Configurez l'environnement Python**

_Créez et activez un environnement virtuel_ :

_Sur macOS/Linux_

```bash
python3 -m venv .venv
source .venv/bin/activate
```

_Sur Windows_

```bash
python -m venv .venv
.venv\Scripts\activate
```

_Installez les dépendances Python_ :

```bash
pip install openai-whisper
```

(Note : L'installation de torch, une dépendance de Whisper, peut prendre plusieurs minutes).

(Optionnel - Pour Windows)
Vous pouvez utiliser le script PowerShell fourni pour tenter d'automatiser l'installation de ffmpeg et des dépendances Python. Ouvrez un terminal PowerShell en tant qu'administrateur et exécutez :

```bash
./install-whisper.ps1
```

_Configurez les variables d'environnement_

_Créez un fichier .env.local à la racine_.

_Ajoutez vos identifiants SMTP pour permettre l'envoi d'e-mails_ :

Exemple pour Gmail

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="votre.email@gmail.com"
SMTP_PASS="votre-mot-de-passe-d-application"

_Lancez l'application_

```bash
npm run dev
```

Ouvrez http://localhost:3000 dans votre navigateur pour commencer à utiliser l'application.

---

### Auteur

Cédrick FEUMEGNE.

---

## Licence

Ce projet est sous licence.

Voir le fichier LICENSE (/LICENSE.md) pour plus de détails.

---

---

# Plus (Installation ----- Déploiement)

```
Pour initier le projet et création du dossier projet, entrer cette commande dans le terminal

npx create-next-app@latest nom-dossier

L'outil `create-next-app` va vous poser quelques questions. Voici les réponses que je vous recommande pour ce projet :

- `Would you like to use TypeScript?` **Yes**
- `Would you like to use ESLint?` **Yes**
- `Would you like to use Tailwind CSS?` **Yes** (C'est crucial lorsque le code utilise Tailwind)
- `Would you like to use `src/` directory?` **Yes**
- `Would you like to use App Router?` **Yes** (Recommandé pour les nouveaux projets Next.js)
- `Would you like to customize the default import alias?` **No**

Laissez l'installation se terminer. Cela prendra quelques minutes car il télécharge toutes les dépendances nécessaires.
```

---

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
