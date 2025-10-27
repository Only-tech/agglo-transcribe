import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/app/lib/db";
import { hash } from "bcryptjs";
import { firestore } from "@/app/lib/firestore";

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

        // Transaction Prisma : crée la réunion + ajoute le créateur comme participant
        const meeting = await db.$transaction(async (prisma) => {
        const newMeeting = await prisma.meeting.create({
            data: {
            title,
            password: hashedPassword,
            creatorId: userId,
            },
        });

        await prisma.participant.create({
            data: {
            userId: userId,
            meetingId: newMeeting.id,
            },
        });

        return newMeeting;
        });

        // Initialisation du document Firestore
        let firestoreOk = false;
        try {
        await firestore.collection("meetings").doc(meeting.id).set({
            title: meeting.title,
            creatorId: meeting.creatorId,
            createdAt: meeting.createdAt.toISOString(),
            status: meeting.status,
        });
        firestoreOk = true;
        console.log("Firestore: document créé pour meeting", meeting.id);
        } catch (fireErr) {
        console.error("Firestore: erreur lors de l'écriture", fireErr);
        }

        return NextResponse.json({ id: meeting.id, firestoreOk });
    } catch (err: unknown) {
        console.error("Erreur création réunion:", err);
        if (err instanceof Error) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }
}
