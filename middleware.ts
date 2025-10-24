// export { default } from "next-auth/middleware"

// // Protège les routes spécifiées
// export const config = { 
//   matcher: [
//     "/dashboard/:path*",
//     "/meetings/:path*",
//   ] 
// };

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    // `withAuth` étend la `Request` avec le token de l'utilisateur.
    function middleware(req) {
        const { pathname } = req.nextUrl;
        const { token } = req.nextauth;

        if (pathname.startsWith("/meetings") && !token) {
        return NextResponse.rewrite(
            new URL("/login?error=ProtectedPage", req.url)
        );
        }

        if (token && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    },
    {
        callbacks: {
        authorized: ({ req, token }) => {
            const { pathname } = req.nextUrl;
            
            // Si la page n'est pas protégée (login, register, page d'accueil),
            // on laisse passer, que l'utilisateur soit connecté ou non.
            if (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname === "/") {
            return true;
            }
            
            
            return !!token;
        },
        },
    }
);

// Configuration du matcher, les routes qui passent par ce middleware
export const config = {
    matcher: [
        /*
        * Match all request paths except for the ones starting with:
        * - api (API routes)
        * - _next/static (static files)
        * - _next/image (image optimization files)
        * - favicon.ico (favicon file)
        */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};