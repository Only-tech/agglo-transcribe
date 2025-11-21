import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";
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

        // Vérification du participant
        const participantResult = await db.query(
          'SELECT id FROM "Participant" WHERE "meetingId" = $1 AND "userId" = $2',
          [meetingId, userId]
        );
        if (participantResult.rowCount === 0) {
          return NextResponse.json(
              { error: "Vous ne participez pas à cette réunion." },
              { status: 403 }
          );
        }

        // Lecture 
        const entriesResult = await db.query(
            'SELECT text FROM "TranscriptEntry" WHERE "meetingId" = $1 ORDER BY timestamp ASC',
            [meetingId]
        );
        const fullText = entriesResult.rows.map((d: { text: string }) => d.text).join("\n");

        if (!fullText) {
            return NextResponse.json({ error: "Aucune transcription disponible." }, { status: 400 });
        }

        // Appel IA 
        let analysis: AnalysisResult;
        try {
            analysis = await getAiAnalysis(fullText);
        } catch (aiErr: unknown) {
            console.error("Erreur:", aiErr);
            if (aiErr instanceof Error) {
                return NextResponse.json(
                    {
                        error: "Erreur lors de l'appel à l'IA",
                        details: aiErr.message,
                    },
                    { status: 500 }
                );
            }
            return NextResponse.json(
                {
                    error: "Erreur lors de l'appel à l'IA",
                    details: String(aiErr),
                },
                { status: 500 }
            );
        }

        // Sauvegarde dans BDD (upsert)
        const savedResult = await db.query(
            `INSERT INTO "Analysis" ("meetingId", summary, themes, "actionItems", "fullText", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ("meetingId") DO UPDATE
             SET summary = EXCLUDED.summary,
                 themes = EXCLUDED.themes,
                 "actionItems" = EXCLUDED."actionItems",
                 "fullText" = EXCLUDED."fullText"
             RETURNING summary, themes, "actionItems"`,
            [meetingId, analysis.summary, JSON.stringify(analysis.themes), JSON.stringify(analysis.actionItems), fullText, new Date()]
        );

        const saved = savedResult.rows[0];

        return NextResponse.json({
            ok: true,
            meetingId,
            analysis: {
                summary: saved.summary,
                themes: typeof saved.themes === 'string' ? JSON.parse(saved.themes) : (saved.themes || []),
                actionItems: typeof saved.actionItems === 'string' ? JSON.parse(saved.actionItems) : (saved.actionItems || []),
            },
        });
    } catch (err: unknown) {
        console.error("Erreur analyse réunion:", err);
        if (err instanceof Error) {
            return NextResponse.json(
                { error: err.message },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}