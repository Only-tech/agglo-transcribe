Cahier des charges fonctionnel et technique

1. Situation
   Le présent définit les exigences et les spécifications pour la conception et le développement d'une interface web permettant aux utilisateurs de s'enregistrer et de charger des fichiers audio et de recevoir leur transcription textuelle en temps réel. Le système s'appuiera sur une API backend qui orchestrera la communication avec un Raspberry Pi via un serveur, où le modèle de reconnaissance vocale Whisper de OpenAI sera exécuté pour la conversion audio-texte.

2. Objectifs du projet
   Objectif principal : Créer une application web intuitive et efficace pour la live-transcription vocale et la transcription de fichiers audio.

   Objectif fonctionnel : Permettre l'enregistrement-live-transcription, le téléchargement de fichiers audio, afficher une barre de progression ou une animation durant la transcription, et présenter le résultat final sous forme de texte, envoyer le fichier texte par mail à l'utilisateur.

   Objectif technique : Développer une architecture modulaire et performante, avec une API qui gère la logique serveur et l'intégration avec une instance de Whisper sur un Raspberry Pi.

3. Fonctionnalités
   3.1. Interface Utilisateur (Frontend)
   Live-transcription : Bouton "icône micro enregistreur" qui permettra ensuite le pause-play et l'ajout d'un bouton "Sortir ou Stop"
   Téléchargement de fichiers : Bouton "Choisir un fichier" pour les fichiers audio (formats MP3, WAV).

   Indicateur de progression : Affichage d'une vue graphique de chargement (une animation) pour indiquer que le fichier a bien été envoyé et que la transcription est en cours.

   Affichage du résultat : Une fois la transcription terminée, le texte résultant doit être affiché dans une zone de texte non modifiable.

   Fonctionnalités post-transcription : L'utilisateur doit avoir la possibilité de copier le texte dans son presse-papiers et de télécharger la transcription au format .txt.

   Gestion des erreurs : Affichage de messages d'erreur clairs en cas de problème (fichier non valide, échec de la transcription).

   3.2. Logique Backend et API
   API RESTful : Une API sera développée pour gérer les requêtes du frontend.

   Endpoint de téléchargement : Un endpoint dédié recevra le fichier audio et le transmettra au serveur via Raspberry Pi pour traitement.

   Endpoint de statut : Un système de communication (une requête de type long-polling ou des WebSockets) permettra au frontend de connaître le statut de la transcription.

   Traitement asynchrone : Le traitement du fichier audio doit être géré de manière asynchrone pour éviter que l'utilisateur n'attende la fin de la transcription.

   3.3. Intégration avec le Raspberry Pi et Whisper
   Instance Whisper : Le modèle Whisper sera pré-installé sur le serveur et communiquera avec le Raspberry Pi, prêt à recevoir des requêtes.

   Communication API-Pi : L'API backend communiquera avec le Raspberry Pi (via le serveur) pour lui envoyer le fichier audio et recevoir la transcription.

4. Spécifications techniques
   Frontend :

   Technologies : Next.js React.js.

   Backend / API :

   Technologies : Python (avec un framework comme Flask ou FastAPI).

   Déploiement : L'APP sera hébergée sur un serveur et sera connectée au Raspberry Pi.

   Raspberry Pi :

   Matériel : Raspberry Pi 2.

   Modèle de transcription :

   Modèle : OpenAI Whisper. Le modèle tiny ou base pourrait être suffisant pour une utilisation sur Raspberry Pi.

5. Diagramme d'architecture
   +-----------+
   | Client |
   | (Browser) |
   +-----------+
   | (1. Live-transcription, Chargement fichier audio)
   V
   +-----------+
   | API |
   | (Backend) |
   +-----------+
   | (2. Envoi fichier au serveur via Raspberry Pi)
   V
   +-------------------+
   | Raspberry Pi -> Serveur |
   | +-----------------+
   | | Modèle Whisper |
   | +-----------------+
   +-------------------+
   | (3. Renvoi transcription)
   V
   +-----------+
   | API |
   | (Backend) |
   +-----------+
   | (4. Envoi transcription au Client)
   V
   +-----------+
   | Client |
   | (Browser) |
   +-----------+

6. Plan de développement
   Phase 1 : Prototype minimal (MVP)

Développement de l'interface utilisateur de base.

Mise en place de l'API pour capturer des paroles et recevoir un fichier.

Configuration initiale de Whisper sur l'app et affichage via serveur sur Raspberry Pi.

Développement de la logique de base pour la communication et la transcription.

Phase 2 : Améliorations

Implémentation de la vue graphique de progression.

Ajout de la gestion des erreurs.

Optimisation des performances (choix du meilleur modèle Whisper).

Ajout des fonctionnalités "Copier" et "Télécharger" "Play", "Pause" et "Stop".

7. Visées
   La transcription doit être rapide et précise.

L'interface utilisateur doit être simple et intuitive.

Le système doit gérer l'écoute et les fichiers audio de différentes tailles sans erreur.

---

---

Un _Prototype Minimal_, ou _MVP (Minimum Viable Product)_, est une version simplifiée d’un produit qui contient juste assez de fonctionnalités pour être utilisable par les premiers utilisateurs et permettre de recueillir leurs retours. C’est une stratégie clé dans les méthodes _Lean Startup_ et _Agile_.

1. Objectif du MVP

- Tester une idée rapidement\* sans investir trop de temps ou d’argent.
- _Valider un besoin réel_ auprès des utilisateurs.
- _Recueillir des retours_ pour améliorer le produit avant un développement complet.

2. Caractéristiques du MVP

- Il est _fonctionnel_ (ce n’est pas juste une maquette ou un concept).
- Il se concentre sur _une ou deux fonctionnalités essentielles_.
- Il doit apporter _une valeur minimale mais suffisante_ à l’utilisateur.

---

```bash
La phase de MVP à mené à la phrase de conceptualisation globale et l'ajout de composants réutilisables, ainsi nous sommes maintenant sur un CRUD à plusieurs pages.
```
