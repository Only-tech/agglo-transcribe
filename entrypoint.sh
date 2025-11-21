#!/bin/bash
# entrypoint.sh

# Le script attend que le serveur Ollama soit démarré par le processus principal
# (qui sera lancé par le 'CMD' à la fin de ce script)

echo "-> Démarrage du téléchargement de llama3..."

# Lance le serveur Ollama en arrière-plan
/bin/ollama serve &

# Attendre que le serveur soit prêt
until curl -s http://127.0.0.1:11434 > /dev/null; do
    echo "En attente du service Ollama..."
    sleep 1
done

echo "-> Serveur Ollama démarré. Téléchargement du modèle llama3..."

# Télécharge le modèle. Si le modèle existe déjà, cette commande est rapide.
ollama pull llama3

echo "-> Téléchargement de llama3 terminé. Modèle prêt à l'emploi."

# Arrête le processus serveur temporaire
kill $(jobs -p)

# Exécute la commande CMD finale (ollama serve) comme processus principal
exec "$@"