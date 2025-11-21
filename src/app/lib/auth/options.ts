import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/app/lib/db";
import { compare } from "bcryptjs";

export const authOptions: AuthOptions = {
    // JWT pour la session
    session: {
        strategy: "jwt",
    },

    // Pages personnalisée
    pages: {
        signIn: "/login",
    },

    // Configuration des identifiants Email/Password
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // Validation basique
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    // Recherche l'utilisateur dans la BDD
                    const result = await db.query(
                        'SELECT * FROM "User" WHERE email = $1',
                        [credentials.email]
                    );
                    const user = result.rows[0];

                    // Vérification existence utilisateur et mot de passe haché
                    if (!user || !user.password) {
                        return null;
                    }

                    // Comparaison du mot de passe
                    const isPasswordValid = await compare(credentials.password, user.password);

                    if (!isPasswordValid) {
                        return null;
                    }

                    // Retourne l'objet utilisateur qui sera passé au callback JWT
                    // Convertit les IDs en string
                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name,
                    };
                } catch (err) {
                    console.error("Erreur dans authorize:", err);
                    return null;
                }
            }
        })
    ],

    // Gestion des données de session et tokens
    callbacks: {
        // Callback appelé quand un JWT est créé ou mis à jour
        async jwt({ token, user }) {
            // "user" est l'objet retourné par authorize(), disponible uniquement lors du premier login
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },

        // Callback appelé à chaque fois que useSession() ou getSession() est utilisé
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string;
                session.user.email = token.email;
                session.user.name = token.name;
            }
            return session;
        }
    },

    // Sécurité
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
};