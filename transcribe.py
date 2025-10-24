import sys
import json
import os
import whisper
import warnings

warnings.filterwarnings("ignore", message="FP16 is not supported on CPU*")


try:
    model = whisper.load_model("tiny") # Changez à 'tiny', 'small', 'base', 'medium', 'large'
except Exception as e:
    sys.stderr.write(f"Erreur chargement modèle Whisper: {str(e)}\n")
    sys.exit(1)

def transcribe(file_path: str):
    result = model.transcribe(
        file_path,
        language="fr",
        temperature=0,
        initial_prompt="Transcription d'une conversation en français." 
    )
    return result["text"]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file provided"}))
        sys.exit(1)

    audio_file = sys.argv[1]

    if not os.path.exists(audio_file):
        print(json.dumps({"error": "Audio file not found"}))
        sys.exit(1)
        
    # Vérification de la taille
    if os.path.getsize(audio_file) < 1000:
        print(json.dumps({"text": ""}))
        sys.exit(0)

    try:
        text = transcribe(audio_file)
        print(json.dumps({"text": text.strip()}))
    except Exception as e:
        sys.stderr.write(f"[Whisper Error] {str(e)}\n")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)