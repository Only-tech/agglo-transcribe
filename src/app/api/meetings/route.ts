import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
        }
        const userId = session.user.id;

        const { title, password } = await req.json();
        if (!title || !password) {
            return NextResponse.json(
                { error: "Titre et mot de passe requis." },
                { status: 400 }
            );
        }

        const hashedPassword = await hash(password, 10);

        // crée la réunion + ajoute le créateur comme participant
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            const newMeetingResult = await client.query(
                'INSERT INTO "Meeting" (title, password, "creatorId", "createdAt") VALUES ($1, $2, $3, $4) RETURNING id',
                [title, hashedPassword, userId, new Date()]
            );
            const newMeeting = newMeetingResult.rows[0];

            await client.query(
                'INSERT INTO "Participant" ("userId", "meetingId", "joinedAt") VALUES ($1, $2, $3)',
                [userId, newMeeting.id, new Date()]
            );
            
            await client.query('COMMIT');
            
            return NextResponse.json({ id: newMeeting.id, dbOk: false });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err: unknown) {
        console.error("Erreur création réunion:", err);
        return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }
}
