import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/app/lib/db";
import { firestore } from "@/app/lib/firestore";
import nodemailer from "nodemailer";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { id: meetingId } = await params;

        const isParticipant = await db.participant.findFirst({
            where: { meetingId, userId: session.user.id },
        });
        if (!isParticipant) {
            return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
        }

        const entriesSnap = await firestore
        .collection(`meetings/${meetingId}/entries`)
        .orderBy("timestamp", "asc")
        .get();

        if (entriesSnap.empty) {
        return NextResponse.json({ error: "Aucune entrée de transcription trouvée." }, { status: 404 });
        }

        const transcription = entriesSnap.docs
        .map((doc) => {
            const data = doc.data();
            const time = new Date(data.timestamp).toLocaleString("fr-FR");
            return `[${time}] ${data.userName}:\n${data.text}`;
        })
        .join("\n\n");

        await firestore.collection("transcripts").doc(meetingId).set({
            text: transcription,
            updatedAt: new Date().toISOString(),
        });

        const participants = await db.participant.findMany({
            where: { meetingId },
            include: { user: { select: { email: true, name: true } } },
        });

        const meeting = await db.meeting.findUnique({ where: { id: meetingId } });

        const subject = `Transcription de la réunion "${meeting?.title || "sans titre"}"`;
        const html = `
            <h1>Bonjour,</h1>
            <p>Voici la transcription complète de la réunion <strong>${meeting?.title}</strong>.</p>
            <pre style="background:#f4f4f4;padding:15px;border-radius:10px;white-space:pre-wrap;">${transcription}</pre>
            <p>Cordialement,<br/>L’équipe AggloTranscribe</p>
        `;

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        let sentCount = 0;
        for (const p of participants) {
            if (p.user?.email) {
                await transporter.sendMail({
                from: `"AggloTranscribe" <${process.env.SMTP_USER}>`,
                to: p.user.email,
                subject,
                html,
                });
                sentCount++;
            }
        }

        return NextResponse.json({ success: true, sent: sentCount });
    } catch (err) {
        console.error("Erreur finalize:", err);
        return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }
}