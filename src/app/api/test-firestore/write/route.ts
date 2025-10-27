import { NextResponse } from "next/server";
import { firestore } from "@/app/lib/firestore";

export async function GET() {
  try {
    const docRef = firestore.collection("test").doc("hello");
    await docRef.set({
      message: "Ceci est un test",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (err: unknown) {
    console.error("Erreur écriture Firestore:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Erreur inconnue" }, { status: 500 });
  }
}
