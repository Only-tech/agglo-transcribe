import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";
import { convertToWav, runWhisper } from "@/app/lib/audioProcessing";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
    const userId = session.user.id;
    const userName = session.user.name || "Participant";

    const formData = await req.formData();
    const file = formData.get("audio") as File;
    const meetingId = formData.get("meetingId") as string;

    if (!file || !meetingId) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const participantResult = await db.query(
      'SELECT id FROM "Participant" WHERE "meetingId" = $1 AND "userId" = $2',
      [meetingId, userId]
    );
    if (participantResult.rowCount === 0) {
      return NextResponse.json({ error: "Accès refusé à cette réunion." }, { status: 403 });
    }

    //Traitement audio (ffmpeg + whisper)
    let text = "";
    let cleanup = async () => {}; 

    try {
        const { wavPath, cleanup: audioCleanup } = await convertToWav(file);
        cleanup = audioCleanup; 
        text = await runWhisper(wavPath);
    } catch (audioError: unknown) {
      if (audioError instanceof Error && audioError.message.includes("trop court")) {
        return NextResponse.json({ transcription: null });
      }
      throw audioError;
    } finally {
        await cleanup(); 
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ transcription: null });
    }

    // Écrit la transcription dans la BD
    const entryResult = await db.query(
      'INSERT INTO "TranscriptEntry" (text, timestamp, "isEdited", "userName", "meetingId", "userId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, text',
      [text.trim(), new Date(Date.now()), false, userName, meetingId, userId]
    );
    
    const entry = entryResult.rows[0];
    return NextResponse.json({ id: entry.id, text: entry.text });

  } catch (err: unknown) {
    console.error("Transcription chunk error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}