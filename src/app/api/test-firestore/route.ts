import { NextResponse } from "next/server";
import { getApp } from "firebase-admin/app";
import { firestore } from "@/app/lib/firestore";

export async function GET() {
  try {
    const app = getApp();

    const projectId = app.options.projectId;

    const collections = await firestore.listCollections();
    const collectionNames = collections.map((c) => c.id);

    return NextResponse.json({
      projectId,
      collections: collectionNames,
    });
  } catch (err: any) {
    console.error("Erreur test Firestore:", err);
    return NextResponse.json(
      { error: err.message || "Erreur Firestore" },
      { status: 500 }
    );
  }
}
