import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const meetingId = params.id;
    
    let client;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }
        const userId = session.user.id;

        client = await db.connect();

        // Vérifie que l'utilisateur actuel fait partie de la réunion
        const isParticipantResult = await client.query(
            'SELECT 1 FROM "Participant" WHERE "meetingId" = $1 AND "userId" = $2 LIMIT 1',
            [meetingId, userId]
        );

        if (isParticipantResult.rowCount === 0) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        // Récupère tous les participants et leurs infos utilisateur
        const participantsResult = await client.query(
            `SELECT u.id, u.name, u.image 
             FROM "User" u
             JOIN "Participant" p ON u.id = p."userId"
             WHERE p."meetingId" = $1`,
            [meetingId]
        );

        return NextResponse.json(participantsResult.rows);

    } catch (error) {
        console.error("Erreur récupération participants:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}