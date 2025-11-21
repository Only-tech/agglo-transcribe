import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";
import { compare } from "bcryptjs";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const meetingId = params.id;

    let client;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
        }
        const userId = session.user.id;

        const { password } = await req.json();
        if (!password) {
            return NextResponse.json({ error: "Mot de passe requis." }, { status: 400 });
        }

        client = await db.connect();

        // Récupère la réunion
        const meetingResult = await client.query(
            'SELECT * FROM "Meeting" WHERE id = $1',
            [meetingId]
        );
        const meeting = meetingResult.rows[0];

        if (!meeting) {
            return NextResponse.json({ error: "Réunion non trouvée." }, { status: 404 });
        }

        // Vérifie le mot de passe
        const isPasswordValid = await compare(password, meeting.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 403 });
        }

        // "Upsert" du participant (insère ou récupère l'ID si existe déjà)
        // Cette requête tente d'insérer. Si ça échoue (conflit sur clé unique "userId_meetingId"),
        // elle retourne l'ID existant.
        const upsertQuery = `
            WITH ins AS (
                INSERT INTO "Participant" ("userId", "meetingId", "joinedAt")
                VALUES ($1, $2, NOW())
                ON CONFLICT ("userId", "meetingId") DO NOTHING
                RETURNING id
            )
            SELECT id FROM ins
            UNION ALL
            SELECT id FROM "Participant"
            WHERE "userId" = $1 AND "meetingId" = $2
            LIMIT 1
        `;
        
        const participantResult = await client.query(upsertQuery, [userId, meetingId]);
        const participantId = participantResult.rows[0].id;

        return NextResponse.json({ 
            success: true, 
            meetingId: meeting.id, 
            participantId: participantId 
        });

    } catch (error) {
        console.error("Erreur pour rejoindre réunion:", error);
        return NextResponse.json({ error: "Une erreur serveur est survenue." }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}