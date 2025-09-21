import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { sessionTranscripts } from "../transcribe/route";

export async function POST(req: Request) {
  try {
    const { to, sessionId, transcription } = await req.json();

    if (!to) {
      return NextResponse.json({ error: "Paramètre 'to' manquant." }, { status: 400 });
    }

    // Si sessionId, on reconstruit fullText côté serveur
    let fullText: string | null = null;
    if (sessionId) {
      const parts = sessionTranscripts.get(sessionId) || [];
      fullText = parts.length ? parts.join(" ") : null;
      if (!fullText) {
        return NextResponse.json(
          { error: "Aucune transcription trouvée pour cette session." },
          { status: 404 }
        );
      }
    }

    // Sinon on accepte une transcription passée directement
    if (!fullText && typeof transcription === "string") {
      fullText = transcription.trim();
    }

    if (!fullText) {
      return NextResponse.json(
        { error: "Aucune transcription fournie (ni sessionId valide, ni transcription)." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,                // "smtp.gmail.com"
      port: Number(process.env.SMTP_PORT) || 587, // 465 si secure
      secure: process.env.SMTP_SECURE === "true", // true -> port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,              // App Password pour Gmail
      },
    });

    const info = await transporter.sendMail({
      from: `"Transcription SI" <${process.env.SMTP_USER}>`,
      to,
      subject: sessionId ? `Transcription de la session ${sessionId}` : "Votre transcription audio",
      html: `
        <h1>Voici votre transcription</h1>
        <pre style="background-color:#f4f4f4;padding:15px;border-radius:15px;white-space:pre-wrap;word-wrap:break-word;">
          ${fullText}
        </pre>
        <br/>
        <p>Cordialement,</p>
        <p>SI - Transcribe</p>
      `,
    });

    return NextResponse.json({ sent: true, messageId: info.messageId });
  } catch (err) {
    if (err instanceof Error) {
      console.error("Transcription error:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    } else {
      console.error("Unknown error:", err);
      return NextResponse.json({ error: "Une erreur inconnue est survenue." }, { status: 500 });
    }
  }
}
