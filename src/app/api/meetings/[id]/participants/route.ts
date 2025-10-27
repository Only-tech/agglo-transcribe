import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/app/lib/db";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const meetingId = params.id;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // const meetingId = params.id;
        const userId = session.user.id;

        // Vérifie que l'utilisateur actuel fait partie de la réunion
        const isParticipant = await db.participant.findFirst({
        where: {
            meetingId: meetingId,
            userId: userId,
        },
        });

        if (!isParticipant) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        // Récupère tous les participants et leurs infos utilisateur
        const participants = await db.participant.findMany({
        where: {
            meetingId: meetingId,
        },
        include: {
            user: {
            select: {
                id: true,
                name: true,
                image: true, // au cas où avatars
            },
            },
        },
        });

        return NextResponse.json(participants.map(p => p.user));

    } catch (error) {
        console.error("Erreur récupération participants:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}