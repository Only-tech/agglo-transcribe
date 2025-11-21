import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères." }, { status: 400 });
        }

        const existingUserResult = await db.query(
            'SELECT id FROM "User" WHERE email = $1',
            [email]
        );

        if (existingUserResult.rows.length > 0) {
            return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
        }

        const hashedPassword = await hash(password, 10);

        // Insertion
        const newUserResult = await db.query(
            'INSERT INTO "User" (name, email, password, "createdAt") VALUES ($1, $2, $3, $4) RETURNING id, name, email',
            [name, email, hashedPassword, new Date()]
        );
        
        const user = newUserResult.rows[0];

        return NextResponse.json(user, { status: 201 });

    } catch (error) {
        console.error("Erreur d'inscription:", error);
        return NextResponse.json({ error: "Une erreur serveur est survenue." }, { status: 500 });
    }
}