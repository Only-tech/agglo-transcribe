import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/app/lib/db";
import { firestore } from "@/app/lib/firestore";
import { getAiAnalysis, AnalysisResult } from "@/app/lib/aiService";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
        }
        const userId = session.user.id;

        const { id } = await context.params;
        const meetingId = id;

        const participant = await db.participant.findFirst({
        where: { meetingId, userId },
        });
        if (!participant) {
        return NextResponse.json(
            { error: "Vous ne participez pas à cette réunion." },
            { status: 403 }
        );
        }

        const transcriptSnap = await firestore
        .collection("meetings")
        .doc(meetingId)
        .collection("transcript")
        .get();

        const fullText = transcriptSnap.docs.map((d) => d.data().text).join("\n");

        if (!fullText) {
        return NextResponse.json(
            { error: "Aucune transcription disponible." },
            { status: 400 }
        );
        }

        // Appel IA (Gemini)
        let analysis: AnalysisResult;
        try {
        analysis = await getAiAnalysis(fullText);
        } catch (aiErr: any) {
        console.error("Erreur Gemini:", aiErr);
        return NextResponse.json(
            {
            error: "Erreur lors de l'appel à l'IA",
            details: aiErr.message || aiErr.toString(),
            },
            { status: 500 }
        );
        }

        // Sauvegarde en base SQL (upsert)
        const saved = await db.analysis.upsert({
        where: { meetingId },
        update: {
            summary: analysis.summary,
            themes: analysis.themes,
            actionItems: analysis.actionItems,
            fullText,
        },
        create: {
            meetingId,
            summary: analysis.summary,
            themes: analysis.themes,
            actionItems: analysis.actionItems,
            fullText,
        },
        });

        return NextResponse.json({
        ok: true,
        meetingId,
        analysis: {
            summary: saved.summary,
            themes: saved.themes,
            actionItems: saved.actionItems,
        },
        });
    } catch (err: any) {
        console.error("Erreur analyse réunion:", err);
        return NextResponse.json(
        { error: err.message || "Erreur serveur" },
        { status: 500 }
        );
    }
}
