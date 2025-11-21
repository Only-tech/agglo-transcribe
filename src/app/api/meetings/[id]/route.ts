import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";  

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    
    const meetingId = (await params).id; 
    
    let client;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }
        const userId = session.user.id;

        // Vérification de l'existence et de l'autorisation
        client = await db.connect(); // Obtient un client depuis le Pool (Pool.connect())
        
        const meetingResult = await client.query(
            'SELECT "creatorId" FROM "Meeting" WHERE id = $1',
            [meetingId]
        );
        const meeting = meetingResult.rows[0];

        if (!meeting) {
            return NextResponse.json({ error: "Réunion introuvable" }, { status: 404 });
        }
        if (meeting.creatorId !== userId) {
            return NextResponse.json({ error: "Action interdite" }, { status: 403 });
        }

        // Suppression des participants, puis de la réunion
        await client.query('BEGIN');
        
        await client.query(
            'DELETE FROM "Participant" WHERE "meetingId" = $1',
            [meetingId]
        );
        
        await client.query(
            'DELETE FROM "Meeting" WHERE id = $1',
            [meetingId]
        );
        
        await client.query('COMMIT');

        return NextResponse.json({ success: true });
        
    } catch (err: unknown) {
        if (client) {
            try {
                await client.query('ROLLBACK'); // Annuler la transaction en cas d'erreur
            } catch (rollbackError) {
                console.error("Erreur lors du ROLLBACK:", rollbackError);
            }
        }
        console.error("Erreur suppression réunion:", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}