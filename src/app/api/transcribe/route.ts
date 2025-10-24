import { NextResponse } from "next/server";
import { stat, writeFile, unlink } from "fs/promises";
import { spawn } from "child_process";
import path from "path";
import os from "os";

// Map pour stocker les transcriptions par session
export const sessionTranscripts = new Map<string, string[]>();

async function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-i", inputPath,
      "-ar", "16000",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stderr.on("data", (data) => {
      console.error("ffmpeg stderr:", data.toString());
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg conversion failed with code ${code}`));
    });
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File;
    const sessionId = formData.get("sessionId") as string | undefined;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier audio reçu." }, { status: 400 });
    }

    const mime = file.type;
    let ext = "tmp"; // Extension générique
    if (mime.includes("webm")) ext = "webm";
    else if (mime.includes("ogg")) ext = "ogg";
    else if (mime.includes("mp4") || mime.includes("m4a")) ext = "m4a";
    else if (mime.includes("mpeg")) ext = "mp3";
    else if (mime.includes("wav")) ext = "wav";

    const rawPath = path.join(os.tmpdir(), `${Date.now()}_raw.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(rawPath, buffer);

    const stats = await stat(rawPath);
    if (stats.size < 1000) { // Le seuil est baissé pour les petits chunks
      await unlink(rawPath);
      return NextResponse.json({ error: "Fichier audio trop court ou incomplet." }, { status: 400 });
    }

    let wavPath = rawPath;
    if (ext !== "wav") {
      wavPath = path.join(os.tmpdir(), `${Date.now()}.wav`);
      await convertToWav(rawPath, wavPath);
      await unlink(rawPath);
    }

    // Chemin vers Python multi-plateforme (Windows, Mac, Linux)
    const projectRoot = process.cwd(); 
    const isWindows = process.platform === "win32";
    const pythonExecutable = isWindows ? "python.exe" : "python";
    
    const pythonVenvPath = isWindows 
      ? path.join(projectRoot, ".venv", "Scripts", pythonExecutable)
      : path.join(projectRoot, ".venv", "bin", pythonExecutable);
      
    const scriptPath = path.resolve(projectRoot, "transcribe.py");

    const result: string = await new Promise((resolve, reject) => {
      let output = "";
      const whisper = spawn(pythonVenvPath, [scriptPath, wavPath]);

      whisper.stdout.on("data", (data) => {
        output += data.toString();
      });

      whisper.stderr.on("data", (data) => {
        console.error("Whisper stderr:", data.toString());
      });

      whisper.on("close", async (code) => {
        try {
          await unlink(wavPath);
        } catch {}

        if (code !== 0) {
          reject(new Error(`Whisper exited with code ${code}`));
        } else {
          try {
            const parsed = JSON.parse(output);
            if (parsed.error) reject(new Error(parsed.error));
            else resolve(parsed.text);
          } catch {
            resolve(output.trim());
          }
        }
      });
    });

    // Nettoyage et vérification du résultat avant de le stocker
    if (sessionId) {
      const existing = sessionTranscripts.get(sessionId) || [];
      const trimmedResult = result.trim();
      if (trimmedResult) {
          existing.push(trimmedResult);
          sessionTranscripts.set(sessionId, existing);
      }
    }

    return NextResponse.json({
      transcription: result,
    });

  } catch (err) {
    if (err instanceof Error) {
      console.error("Transcription error:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    } else {
      console.error("Unknown error:", err);
      return NextResponse.json({ error: "Une erreur inconnue est survenue." }, { status: 500 });
    }
  }
}