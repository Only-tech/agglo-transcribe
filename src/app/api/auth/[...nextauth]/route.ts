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

            const user = await db.user.findUnique({
            where: { email: credentials.email }
            });

            if (!user || !user.password) {
            return null;
            }

            const isPasswordValid = await compare(credentials.password, user.password);

            if (!isPasswordValid) {
            return null;
            }

            return {
            id: user.id,
            email: user.email,
            name: user.name,
            };
        }
        })
    ],

    callbacks: {
        async jwt({ token, user }) {
        if (user) {
            token.id = user.id; 
        }
        return token;
        },
        
        async session({ session, token }) {
        if (session.user) {
            session.user.id = token.id as string; 
        }
        return session;
        }
    },
    
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };