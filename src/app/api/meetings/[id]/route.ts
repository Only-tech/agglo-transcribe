import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/app/lib/db";
import { firestore } from "@/app/lib/firestore";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }
        const userId = session.user.id;
        const meetingId = params.id;

        const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
        if (!meeting) {
        return NextResponse.json({ error: "Réunion introuvable" }, { status: 404 });
        }
        if (meeting.creatorId !== userId) {
        return NextResponse.json({ error: "Action interdite" }, { status: 403 });
        }

        await db.$transaction(async (prisma) => {
        await prisma.participant.deleteMany({ where: { meetingId } });
        await prisma.meeting.delete({ where: { id: meetingId } });
        });

        try {
        await firestore.collection("meetings").doc(meetingId).delete();
        console.log("Firestore: document supprimé pour meeting", meetingId);
        } catch (fireErr) {
        console.error("Firestore: erreur lors de la suppression", fireErr);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Erreur suppression réunion:", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
