import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";
import nodemailer from "nodemailer";

// Types pour Transcription
type TranscriptEntryRow = {
    userName: string;
    text: string;
    timestamp: string | Date;
};

type AnalysisRow = {
    summary: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    themes: any; // JSONB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actionItems: any; // JSONB
};

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Vérifie la session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { id: meetingId } = await params;

        // Vérifie que l'utilisateur est participant
        const isParticipantResult = await db.query(
          'SELECT id FROM "Participant" WHERE "meetingId" = $1 AND "userId" = $2',
          [meetingId, session.user.id]
        );
        if (isParticipantResult.rowCount === 0) {
            return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
        }

        // Récupère la transcription
        const entriesResult = await db.query(
            'SELECT "userName", text, timestamp FROM "TranscriptEntry" WHERE "meetingId" = $1 ORDER BY timestamp ASC',
            [meetingId]
        );

        if (entriesResult.rowCount === 0) {
            return NextResponse.json({ error: "Aucune entrée de transcription trouvée." }, { status: 404 });
        }

        const transcription = entriesResult.rows.map((doc: TranscriptEntryRow) => {
            const time = new Date(doc.timestamp).toLocaleString("fr-FR");
            return `[${time}] ${doc.userName}:\n${doc.text}`;
        }).join("\n\n");

        // ---------------------------------------------------------
        // LOGIQUE CONDITIONNELLE POUR L'ANALYSE 
        // ---------------------------------------------------------
        
        // Tente de récupérer l'analyse pour ce meeting
        const analysisResult = await db.query(
            'SELECT summary, themes, "actionItems" FROM "Analysis" WHERE "meetingId" = $1',
            [meetingId]
        );
        
        // Récupère la première ligne (ou undefined si aucune analyse n'a été faite)
        const analysis = analysisResult.rows[0] as AnalysisRow | undefined;

        // Prépare le HTML. Si "analysis" n'existe pas, cette chaîne reste vide.
        let analysisHtml = "";

        if (analysis) {
            // Si on rentre ici, c'est qu'une analyse EXISTE.
            
            // Conversion sécurisée des champs JSONB en tableau HTML
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formatList = (jsonItem: any) => {
                if (!jsonItem) return "";
                // Si c'est une chaîne (parfois le JSON est stocké en string), on parse
                const items = typeof jsonItem === 'string' ? JSON.parse(jsonItem) : jsonItem;
                if (Array.isArray(items) && items.length > 0) {
                    return items.map((i: string) => `<li>${i}</li>`).join('');
                }
                return "";
            };

            const themesList = formatList(analysis.themes);
            const actionsList = formatList(analysis.actionItems);

            analysisHtml = `
                <div style="background-color: #eef2ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #c7d2fe;">
                    <h2 style="color: #312e81; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #c7d2fe; padding-bottom: 10px;">Synthèse</h2>
                    
                    <div style="margin-bottom: 20px;">
                        <strong style="color: #4338ca; display:block; margin-bottom:5px;">Résumé global</strong>
                        <p style="color: #3730a3; margin: 0; line-height: 1.6;">${analysis.summary || "Aucun résumé disponible."}</p>
                    </div>
                    
                    ${themesList ? `
                    <div style="margin-bottom: 20px;">
                        <strong style="color: #4338ca; display:block; margin-bottom:5px;">Thèmes clés</strong>
                        <ul style="color: #3730a3; margin: 0; padding-left: 20px;">${themesList}</ul>
                    </div>` : ''}

                    ${actionsList ? `
                    <div>
                        <strong style="color: #4338ca; display:block; margin-bottom:5px;">Actions à suivre</strong>
                        <ul style="color: #3730a3; margin: 0; padding-left: 20px;">${actionsList}</ul>
                    </div>` : ''}
                </div>
            `;
        }

        // ---------------------------------------------------------
        // FIN DE LA LOGIQUE CONDITIONNELLE
        // ---------------------------------------------------------

        // Récupère les infos de la réunion (Titre)
        const meetingResult = await db.query(
            'SELECT title FROM "Meeting" WHERE id = $1',
            [meetingId]
        );
        const meeting = meetingResult.rows[0];

        // Récupère les emails des participants
        const participantsResult = await db.query(
            `SELECT u.email, u.name FROM "Participant" p
             JOIN "User" u ON p."userId" = u.id
             WHERE p."meetingId" = $1`,
            [meetingId]
        );
        const participants = participantsResult.rows;

        // Construit le corps du mail
        const subject = `Compte-rendu : "${meeting?.title || "Réunion"}"`;
        
        // injecte ${analysisHtml}. Si c'est vide, rien ne s'affiche.
        const html = `
            <div style="font-family: Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #111;">Bonjour,</h1>
                <p style="font-size: 16px;">Voici le compte-rendu de la réunion <strong>${meeting?.title}</strong>.</p>
                
                ${analysisHtml}

                <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">Transcription complète</h3>
                <pre style="background:#f8f9fa; padding:15px; border-radius:8px; white-space:pre-wrap; font-family: monospace; color: #555; font-size: 13px; border: 1px solid #e9ecef;">${transcription}</pre>
                
                <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                    - AggloTranscribe -
                </p>
            </div>
        `;

        // Configure SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        // Envoi des emails
        let sentCount = 0;
        for (const p of participants) {
            // accès direct à l'email
            if (p.email) { 
                await transporter.sendMail({
                    from: `"AggloTranscribe" <${process.env.SMTP_USER}>`,
                    to: p.email,
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