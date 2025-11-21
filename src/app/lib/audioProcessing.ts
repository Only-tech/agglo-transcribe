import { spawn } from "child_process";
import path from "path";
import os from "os";
import { stat, writeFile, unlink } from "fs/promises";

// Convertit un fichier audio en WAV 16kHz mono
export async function convertToWav(file: File): Promise<{ wavPath: string; cleanup: () => Promise<void> }> {
  const mime = file.type;
  let ext = "tmp";
  if (mime.includes("webm")) ext = "webm";
  else if (mime.includes("ogg")) ext = "ogg";
  else if (mime.includes("mp4") || mime.includes("m4a")) ext = "m4a";
  else if (mime.includes("mpeg")) ext = "mp3";
  else if (mime.includes("wav")) ext = "wav";

  const rawPath = path.join(os.tmpdir(), `${Date.now()}_raw.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(rawPath, buffer);

  const stats = await stat(rawPath);
  if (stats.size < 1000) {
    await unlink(rawPath);
    throw new Error("Fichier audio trop court ou incomplet.");
  }

  // Conversion si ce n'est pas un wav
  let wavPath = rawPath;
  if (ext !== "wav") {
    wavPath = path.join(os.tmpdir(), `${Date.now()}.wav`);
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", rawPath,
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        wavPath,
      ]);
      ffmpeg.on("close", (code) => (code === 0 ? resolve(true) : reject(new Error(`FFMPEG exit code ${code}`))));
    });
  }

  const cleanup = async () => {
    try {
      await unlink(rawPath);
      if (rawPath !== wavPath) await unlink(wavPath);
    } catch (e) {
      console.warn("Erreur lors du nettoyage des fichiers audio", e);
    }
  };

  return { wavPath, cleanup };
}

export async function runWhisper(wavPath: string): Promise<string> {
  const projectRoot = process.cwd();
  const scriptPath = path.resolve(projectRoot, "transcribe.py");

  return new Promise((resolve, reject) => {
    let output = "";
    const whisper = spawn("python3", [scriptPath, wavPath]);

    whisper.stdout.on("data", (data) => (output += data.toString()));
    whisper.stderr.on("data", (data) => console.error("Whisper stderr:", data.toString()));
    whisper.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Whisper exited with code ${code}`));
      try {
        const parsed = JSON.parse(output);
        if (parsed.error) reject(new Error(parsed.error));
        else resolve(parsed.text);
      } catch {
        resolve(output.trim()); 
      }
    });
  });
}