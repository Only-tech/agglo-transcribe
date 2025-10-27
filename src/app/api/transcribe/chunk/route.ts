import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
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
    const userId = session.user.id;
    const userName = session.user.name || "Participant";

    const formData = await req.formData();
    const file = formData.get("audio") as File;
    const meetingId = formData.get("meetingId") as string;

    if (!file || !meetingId) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const participant = await db.participant.findFirst({
        where: { meetingId: meetingId, userId: userId }
    });
    
    if (!participant) {
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

    // Pas sauvegarde si Whisper n'a rien retourné
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ transcription: null });
    }

    //  fetcher le meeting.firestoreCollectionId
    const firestoreCollectionId = meetingId; 
    
    const entry = {
      userId: userId,
      userName: userName,
      text: text.trim(),
      isEdited: false,
      timestamp: Date.now(),
    };

    const docRef = await firestore
      .collection("meetings")
      .doc(firestoreCollectionId)
      .collection("entries")
      .add(entry);

    return NextResponse.json({ id: docRef.id, text: entry.text });

  } catch (err: unknown) {
    console.error("Transcription chunk error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}