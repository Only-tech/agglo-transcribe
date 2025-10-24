export type AnalysisResult = {
    summary: string;
    themes: string[];
    actionItems: string[];
};

/**
 * Appelle le modèle Gemini pour analyser un texte de réunion
 */
export async function getAiAnalysis(fullText: string): Promise<AnalysisResult> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("Clé API Google manquante (GOOGLE_API_KEY).");
    }

    // Prompt clair pour forcer un JSON structuré
    const prompt = `
    Analyse le texte suivant d'une réunion et renvoie un JSON strict avec les clés :
    - summary: résumé concis en français
    - themes: tableau de thèmes principaux
    - actionItems: tableau de tâches/action items

    Texte:
    """${fullText}"""
    `;

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
        }),
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur Gemini: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();

    // Récupère le texte brut
    const rawText: string =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
        throw new Error("Réponse vide de Gemini.");
    }

    // Nettoie les éventuels blocs ```json ... ```
    const cleaned = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    let parsed: any;
    try {
        parsed = JSON.parse(cleaned);
    } catch (err) {
        console.error("Erreur parsing JSON Gemini:", cleaned);
        throw new Error("Impossible de parser la réponse Gemini en JSON.");
    }

    // Sécurise les champs
    return {
        summary: parsed.summary ?? "",
        themes: Array.isArray(parsed.themes) ? parsed.themes : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    };
}
