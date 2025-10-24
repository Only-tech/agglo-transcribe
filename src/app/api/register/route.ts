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

        const existingUser = await db.user.findUnique({
        where: { email: email }
        });

        if (existingUser) {
        return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
        }

        const hashedPassword = await hash(password, 10);

        const user = await db.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        }
        });

        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json(userWithoutPassword, { status: 201 });

    } catch (error) {
        console.error("Erreur d'inscription:", error);
        return NextResponse.json({ error: "Une erreur serveur est survenue." }, { status: 500 });
    }
}