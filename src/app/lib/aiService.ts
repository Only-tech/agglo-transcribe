export type AnalysisResult = {
    summary: string;
    themes: string[];
    actionItems: string[];
};

// URL de l'API Ollama (injectée depuis l'environnement Docker)
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";
const OLLAMA_MODEL = "llama3"; 

/**
 * Appelle un modèle Ollama local pour analyser un texte de réunion
 */
export async function getAiAnalysis(fullText: string): Promise<AnalysisResult> {

    // Prompt clair pour forcer un JSON structuré
    const prompt = `
    Tu es un assistant d'analyse de réunion. Analyse le texte suivant et retourne
    UNIQUEMENT un objet JSON valide (pas de texte avant ou après) avec les clés :
    - "summary": Un résumé concis en français.
    - "themes": Un tableau des thèmes principaux.
    - "actionItems": Un tableau des tâches et actions à suivre.

    Voici le texte de la réunion:
    """${fullText}"""
    `;

    const response = await fetch(
        `${OLLAMA_API_URL}/api/generate`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                format: "json", // Demande à Ollama de forcer la sortie JSON
                stream: false,  // Nous voulons la réponse complète d'un coup
            }),
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur Ollama: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    
    if (!data.response) {
        throw new Error("Réponse vide d'Ollama.");
    }

    let parsed: Partial<AnalysisResult>;
    try {
        // data.response contient la chaîne JSON générée par le modèle
        parsed = JSON.parse(data.response) as Partial<AnalysisResult>;
    } catch (err) {
        console.error("Erreur parsing JSON Ollama:", err, data.response);
        throw new Error("Impossible de parser la réponse d'Ollama en JSON.");
    }

    // Sécurise les champs
    return {
        summary: parsed.summary ?? "",
        themes: Array.isArray(parsed.themes) ? parsed.themes : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    };
}