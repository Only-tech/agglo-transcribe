import { NextResponse } from "next/server";
import { firestore } from "@/app/lib/firestore";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const meetingDoc = await firestore.collection("meetings").doc(id).get();

        const entriesSnap = await firestore
        .collection(`meetings/${id}/entries`)
        .limit(5) 
        .get();

        const transcriptDoc = await firestore.collection("transcripts").doc(id).get();

        return NextResponse.json({
        meeting: meetingDoc.exists
            ? { id: meetingDoc.id, data: meetingDoc.data() }
            : "Aucun document dans 'meetings'",

        entries: entriesSnap.empty
            ? " Aucun document dans 'meetings/{id}/entries'"
            : entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),

        transcript: transcriptDoc.exists
            ? { id: transcriptDoc.id, data: transcriptDoc.data() }
            : "Aucun document dans 'transcripts'",
        });
    } catch (err: unknown) {
        console.error("Erreur debug Firestore:", err);
        if (err instanceof Error) {
        return NextResponse.json({ error: err.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Erreur Firestore" }, { status: 500 });
    }
}
