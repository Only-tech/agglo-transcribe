import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db"; 

// Type pour meeting
type Meeting = {
    id: string;
    title: string;
    createdAt: Date;
    status: string;
    creatorId: string;
    password?: string; 
};

// Type pour la ligne brute sortant de la BDD
// (createdAt est un string)
type DbMeetingRow = Omit<Meeting, 'createdAt'> & {
    createdAt: string;
};

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const cursor = searchParams.get("cursor");
    const userId = session.user.id;

    let client;
    try {
        client = await db.connect();

        // Récupère les réunions créées
        const createdMeetingsResult = await client.query(
            'SELECT * FROM "Meeting" WHERE "creatorId" = $1 ORDER BY "createdAt" DESC',
            [userId]
        );
        
        // Utilise le type 'DbMeetingRow'
        const createdMeetings: Meeting[] = createdMeetingsResult.rows.map((m: DbMeetingRow) => ({
            ...m,
            createdAt: new Date(m.createdAt) 
        }));

        // Récupère les réunions rejointes
        const joinedMeetingsResult = await client.query(
            `SELECT m.* FROM "Meeting" m
             JOIN "Participant" p ON m.id = p."meetingId"
             WHERE p."userId" = $1 AND m."creatorId" != $1
             ORDER BY p."joinedAt" DESC`,
            [userId]
        );

        // Utilise le type 'DbMeetingRow'
        const joinedMeetings: Meeting[] = joinedMeetingsResult.rows.map((m: DbMeetingRow) => ({
            ...m,
            createdAt: new Date(m.createdAt)
        }));

        // Utilise le type 'Meeting'
        const allMeetingsMap = new Map<string, Meeting>();
        [...createdMeetings, ...joinedMeetings].forEach((m) => {
            allMeetingsMap.set(m.id, m);
        });

        // Ajout des types aux arguments de sort() pour plus de sécurité
        const allMeetings = Array.from(allMeetingsMap.values()).sort(
            (a: Meeting, b: Meeting) => b.createdAt.getTime() - a.createdAt.getTime()
        );

        let startIndex = 0;
        if (cursor) {
            const index = allMeetings.findIndex((m) => m.id === cursor);
            if (index >= 0) startIndex = index + 1;
        }

        const paginated = allMeetings.slice(startIndex, startIndex + limit + 1);
        const hasMore = paginated.length > limit;
        const items = hasMore ? paginated.slice(0, -1) : paginated;

        return NextResponse.json({
            items,
            nextCursor: hasMore ? items[items.length - 1].id : null,
        });

    } catch (error) {
        console.error("Erreur récupération historique:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}