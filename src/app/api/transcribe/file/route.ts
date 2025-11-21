import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";
import { convertToWav, runWhisper } from "@/app/lib/audioProcessing";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("audio") as File;
    const meetingId = formData.get("meetingId") as string;

    if (!file || !meetingId) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    // Vérification du participant
    const participantResult = await db.query(
      'SELECT id FROM "Participant" WHERE "meetingId" = $1 AND "userId" = $2',
      [meetingId, session.user.id]
    );
    if (participantResult.rowCount === 0) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    // Conversion + transcription
    const { wavPath, cleanup } = await convertToWav(file);
    const text = await runWhisper(wavPath);
    await cleanup();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ transcription: null });
    }

    // Écrit la transcription dans la BDD
    const entryResult = await db.query(
      'INSERT INTO "TranscriptEntry" (text, timestamp, "isEdited", "userName", "meetingId", "userId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING text',
      [
        text.trim(),
        new Date(Date.now()),
        false,
        session.user.name || "Participant",
        meetingId,
        session.user.id,
      ]
    );

    const entry = entryResult.rows[0];
    return NextResponse.json({ text: entry.text });
  } catch (err: unknown) {
    console.error("Erreur upload fichier:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}