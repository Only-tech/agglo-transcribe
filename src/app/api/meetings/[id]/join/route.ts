import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/app/lib/db";
import { compare } from "bcryptjs";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
        }
        const userId = session.user.id;
        const meetingId = params.id;

        const { password } = await req.json();
        if (!password) {
        return NextResponse.json({ error: "Mot de passe requis." }, { status: 400 });
        }

        const meeting = await db.meeting.findUnique({
        where: { id: meetingId }
        });

        if (!meeting) {
        return NextResponse.json({ error: "Réunion non trouvée." }, { status: 404 });
        }

        const isPasswordValid = await compare(password, meeting.password);
        if (!isPasswordValid) {
        return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 403 });
        }

        const participant = await db.participant.upsert({
            where: {
                userId_meetingId: {
                    userId: userId,
                    meetingId: meetingId
                }
            },
            update: {}, 
            create: {
                userId: userId,
                meetingId: meetingId
            }
        });

        return NextResponse.json({ success: true, meetingId: meeting.id, participantId: participant.id });

    } catch (error) {
        console.error("Erreur pour rejoindre réunion:", error);
        return NextResponse.json({ error: "Une erreur serveur est survenue." }, { status: 500 });
    }
}