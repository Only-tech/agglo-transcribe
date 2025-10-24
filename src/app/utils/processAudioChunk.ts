// Buffer glissant par session
const slidingBuffers: Record<string, BlobPart[]> = {};

export async function processAudioChunk( blob: Blob, sessionId: string): Promise<string | null> {
  try {
    if (!slidingBuffers[sessionId]) {
      console.warn("[processAudioChunk] Session terminée ou invalide, chunk ignoré");
      return null;
    }

    // Ignore les micro-chunks (souvent invalides)
    if (blob.size < 4000) {
      console.warn("[processAudioChunk] Chunk ignoré (trop petit):", blob.size, "bytes");
      return null;
    }

    // Initialise le buffer si nécessaire
    if (!slidingBuffers[sessionId]) {
      slidingBuffers[sessionId] = [];
    }

    slidingBuffers[sessionId].push(blob);

    // Construit un blob combiné (buffer glissant)
    const liveBlob = new Blob(slidingBuffers[sessionId], { type: "audio/webm" });

    const formData = new FormData();
    formData.append("audio", liveBlob, "chunk.webm");
    formData.append("sessionId", sessionId);

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[processAudioChunk] Erreur HTTP:", res.status, errText);
      return null;
    }

    const data = await res.json();

    // Après envoi, le dernier morceau est gardé pour overlap
    slidingBuffers[sessionId] = [blob];

    return data.transcription || null;
  } catch (err) {
    console.error("[processAudioChunk] Exception:", err);
    return null;
  }
}
