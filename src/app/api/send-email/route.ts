import { NextResponse } from 'next/server';
import { Resend } from 'resend';


const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, transcription } = body;

    if (!email || !transcription) {
      return NextResponse.json({ error: 'Email and transcription are required.' }, { status: 400 });
    }

    const emailData = {
      from: 'Transcription SI <onboarding@resend.dev>', 
      to: [email],
      subject: 'Votre transcription audio',
      html: `
        <h1>Voici votre transcription</h1>
        <p>Merci d'avoir utilisé notre service.</p>
        <pre style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word;">${transcription}</pre>
        <br>
        <p>Cordialement,</p>
        <p>Le service informatique - Transcription</p>
      `,
    };

    // sending email
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('[EMAIL ERROR] Erreur lors de l\'envoi via Resend:', error);
      return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
    }

    console.log(`[API] Email envoyé avec succès à ${email}. ID: ${data?.id}`);
    return NextResponse.json({ message: 'Email sent successfully!', emailId: data?.id });

  } catch (error) {
    console.error('[API] Erreur générale dans send-email:', error);
    return NextResponse.json({ error: 'Failed to process the request.' }, { status: 500 });
  }
}