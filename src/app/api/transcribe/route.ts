import { NextResponse } from 'next/server';
import OpenAI from 'openai';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    console.log(`[API] Fichier audio reçu: ${file.name}. Lancement de la transcription via OpenAI Whisper...`);

    try {
      const transcriptionResponse = await openai.audio.transcriptions.create({
        model: 'whisper-1', 
        file: file,        
      });

      const transcription = transcriptionResponse.text;
      console.log(`[API] Transcription réelle terminée.`);
      return NextResponse.json({ transcription });

    } catch (apiError) {
       console.error('[API ERROR] Erreur lors de la transcription via OpenAI:', apiError);
       return NextResponse.json({ error: 'Failed to transcribe audio with external API.' }, { status: 500 });
    }

  } catch (error) {
    console.error('[API] Erreur générale:', error);
    return NextResponse.json({ error: 'Failed to process audio' }, { status: 500 });
  }
}