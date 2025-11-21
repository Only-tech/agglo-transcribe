import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { id: meetingId } = await params;

        // Vérifie si l'utilisateur est participant
        const participantResult = await db.query(
          'SELECT id FROM "Participant" WHERE "meetingId" = $1 AND "userId" = $2',
          [meetingId, session.user.id]
        );

        if (participantResult.rows.length === 0) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        // Récupère les entrées
        const entriesResult = await db.query(
            `SELECT id, text, timestamp, "isEdited", "originalText", "userName", "userId"
             FROM "TranscriptEntry"
             WHERE "meetingId" = $1
             ORDER BY timestamp ASC`,
            [meetingId]
        );

        return NextResponse.json({ entries: entriesResult.rows });

    } catch (error) {
        console.error("Erreur récupération entries:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}