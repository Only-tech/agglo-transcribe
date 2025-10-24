import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/app/lib/db";
import { compare } from "bcryptjs";

export const authOptions: AuthOptions = {
    // Utilise Prisma pour stocker les sessions, utilisateurs, comptes
    adapter: PrismaAdapter(db),
    session: {
        strategy: "jwt",
    },
    
    pages: {
        signIn: "/login",
    },

    providers: [
        CredentialsProvider({
        name: "Credentials",
        credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
            return null;
            }

            // 1. Trouver l'utilisateur
            const user = await db.user.findUnique({
            where: { email: credentials.email }
            });

            if (!user || !user.password) {
            // Si l'utilisateur existe mais n'a pas de mdp (ex: auth Google)
            return null;
            }

            // 2. Vérifier le mot de passe
            const isPasswordValid = await compare(credentials.password, user.password);

            if (!isPasswordValid) {
            return null;
            }

            // 3. Retourner l'utilisateur (sans le mot de passe)
            return {
            id: user.id,
            email: user.email,
            name: user.name,
            };
        }
        })
        // ... vous pouvez ajouter d'autres providers (Google, GitHub, etc.)
    ],

    callbacks: {
        // Ce callback est appelé quand un JWT est créé/mis à jour
        async jwt({ token, user }) {
        if (user) {
            token.id = user.id; // Ajoute l'ID de l'utilisateur au token
        }
        return token;
        },
        
        // Ce callback est appelé quand une session est accédée
        async session({ session, token }) {
        if (session.user) {
            session.user.id = token.id as string; // Ajoute l'ID à l'objet session
        }
        return session;
        }
    },
    
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };