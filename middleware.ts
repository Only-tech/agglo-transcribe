import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                const { pathname } = req.nextUrl;

                // Laisse passer les routes publiques
                if (
                    pathname === "/" ||                         
                    pathname.startsWith("/login") ||            
                    pathname.startsWith("/register") ||         
                    pathname.startsWith("/_next") ||            
                    pathname.startsWith("/public") ||          
                    pathname.startsWith("/api/auth")||         
                    pathname.startsWith("/api/register") ||    
                    pathname.startsWith("/api/transcribe")      // Routes des transcriptions (chunk, file, demo)
                ) {
                    return true;
                }

                // Tout le reste nécessite un token
                return !!token;
            },
        },
        secret: process.env.NEXTAUTH_SECRET,
    }
);

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};