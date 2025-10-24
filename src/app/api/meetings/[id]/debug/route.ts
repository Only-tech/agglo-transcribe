import { NextResponse } from "next/server";
import { firestore } from "@/app/lib/firestore";

export async function GET(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const docRef = firestore.collection("meetings").doc(id);
        const snapshot = await docRef.get();

        if (!snapshot.exists) {
        return NextResponse.json(
            { error: `Aucun document Firestore trouvé pour l'ID ${id}` },
            { status: 404 }
        );
        }

        return NextResponse.json({
        id: snapshot.id,
        data: snapshot.data(),
        });
    } catch (err: any) {
        console.error("Erreur lecture Firestore:", err);
        return NextResponse.json(
        { error: err.message || "Erreur Firestore" },
        { status: 500 }
        );
    }
}
