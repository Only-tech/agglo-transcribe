import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth/options";
import { db } from "@/app/lib/db";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ entryId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { entryId } = await params;
        const { newText } = await req.json();

        if (!newText) {
            return NextResponse.json({ error: "Texte manquant" }, { status: 400 });
        }

        // Récupère l'entrée pour vérifier l'auteur ET obtenir l'ancien texte
        const entryResult = await db.query(
            'SELECT "userId", text, "originalText" FROM "TranscriptEntry" WHERE id = $1',
            [entryId]
        );

        if (entryResult.rows.length === 0) {
            return NextResponse.json({ error: "Entrée non trouvée" }, { status: 404 });
        }

        const entry = entryResult.rows[0];

        // Seul l'auteur peut éditer
        if (entry.userId !== session.user.id) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        // Détermine le texte original à sauvegarder
        const originalTextToSave = entry.originalText ?? entry.text;

        // Met à jour l'entrée
        const updatedEntryResult = await db.query(
            `UPDATE "TranscriptEntry"
             SET text = $1, "isEdited" = true, "originalText" = $2
             WHERE id = $3
             RETURNING *`, // Renvoie l'entrée mise à jour
            [newText, originalTextToSave, entryId]
        );

        return NextResponse.json({ success: true, entry: updatedEntryResult.rows[0] });

    } catch (error) {
        console.error("Erreur update entry:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}