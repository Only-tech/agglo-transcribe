import { NextResponse } from "next/server";
import { convertToWav, runWhisper } from "@/app/lib/audioProcessing";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("audio") as File;

        if (!file) {
        return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
        }

        const { wavPath, cleanup } = await convertToWav(file);
        const text = await runWhisper(wavPath);
        await cleanup();

        if (!text || text.trim().length === 0) {
        return NextResponse.json({ text: null });
        }

        return NextResponse.json({ text: text.trim() });
    } catch (err: any) {
        console.error("Erreur transcription démo:", err);
        return NextResponse.json(
        { error: err.message || "Erreur serveur." },
        { status: 500 }
        );
    }
}
