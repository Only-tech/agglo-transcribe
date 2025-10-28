import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/app/lib/db";
import { firestore } from "@/app/lib/firestore";
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

    const participant = await db.participant.findFirst({
      where: { meetingId, userId: session.user.id },
    });
    if (!participant) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    // Conversion + transcription
    const { wavPath, cleanup } = await convertToWav(file);
    const text = await runWhisper(wavPath);
    await cleanup();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ transcription: null });
    }

    // Sauvegarde Firestore
    const entry = {
      userId: session.user.id,
      userName: session.user.name || "Participant",
      text: text.trim(),
      isEdited: false,
      timestamp: Date.now(),
    };

    await firestore
      .collection("meetings")
      .doc(meetingId)
      .collection("entries")
      .add(entry);

    return NextResponse.json({ text: entry.text });
  } catch (err: unknown) {
    console.error("Erreur upload fichier:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
