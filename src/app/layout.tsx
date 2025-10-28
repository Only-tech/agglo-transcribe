'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Montserrat } from 'next/font/google';
import "./globals.css";
import { Providers } from './providers';
import { ThemeToggle } from '@/app/ui/ThemeToggle';
import Link from "next/link";
import { AuthStatus } from "@/app/ui/AuthStatus";
import AggloTranscribeLogo from '@/app/ui/logo/AggloTranscribeLogo'; 
import Loader from '@/app/ui/Loader'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-montserrat',     
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const isHomePage = pathname === "/"
    if (isHomePage) {
      setShowOverlay(false)
      return
    }

    setShowOverlay(true)
    setLoading(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => (prev < 95 ? prev + 5 : prev))
    }, 100)

    // Fin progress
    const timer = setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      setLoading(false)
      setTimeout(() => setShowOverlay(false), 300)
    }, 800)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [pathname])
  
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${montserrat.className} min-h-dvh grid grid-rows-[auto_1fr_auto]`}>
        <Providers>
          <header className="flex justify-center md:justify-between gap-3 flex-wrap items-center px-[5%] py-2 border-b border-gray-300 dark:border-white/10">
            <Link href="/"
              title="Transcrire - De la parole au text" 
              className="text-xl font-bold text-gray-900 dark:text-white/90 hover:text-blue-800  translate-y-0 hover:translate-y-1.5 scale-100 hover:scale-102 transform transition-all ease-out duration-600"
            >
              <AggloTranscribeLogo/>
            </Link>
            <AuthStatus />
          </header>
          {showOverlay && (
            <div
              className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fcfff7] dark:bg-[#222222] transition-opacity duration-300 ${
                loading ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Loader variant="both" progress={progress} />
            </div>
          )}
          <main className="relative  flex flex-col justify-start xl:justify-center p-2 sm:p-4">
            {children}
          </main>
          
          <footer className="flex justify-end py-2 px-3 border-t border-gray-300 dark:border-white/10">
            <ThemeToggle />
          </footer>
        </Providers>
      </body>
    </html>
  );
}


// import type { Metadata } from "next";
// import { Montserrat } from 'next/font/google';
// import "./globals.css";
// import { Providers } from './providers';
// import { ThemeToggle } from '@/app/ui/ThemeToggle';
// import Link from "next/link";
// import { AuthStatus } from "@/app/ui/AuthStatus";
// import AggloTranscribeLogo from '@/app/ui/logo/AggloTranscribeLogo'; 

// const montserrat = Montserrat({
//   subsets: ['latin'],
//   weight: ['400', '500', '600', '700', '900'],
//   variable: '--font-montserrat',     
// });

// export const metadata: Metadata = {
//   title: "Transcripteur Audio Pro",
//   description: "Gestion de réunions et transcription",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="fr" suppressHydrationWarning>
//       <head>
//         <script
//           dangerouslySetInnerHTML={{
//             __html: `
//               (function() {
//                 try {
//                   const theme = localStorage.getItem('theme');
//                   if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
//                     document.documentElement.classList.add('dark');
//                   }
//                 } catch (_) {}
//               })();
//             `,
//           }}
//         />
//       </head>
//       <body className={`${montserrat.className} min-h-dvh grid grid-rows-[auto_1fr_auto]`}>
//         <Providers>
//           <header className="flex justify-center md:justify-between gap-3 flex-wrap items-center px-[5%] py-2 border-b border-gray-300 dark:border-white/10">
//             <Link href="/"
//               title="Transcrire - De la parole au text" 
//               className="text-xl font-bold text-gray-900 dark:text-white/90 hover:text-blue-800  translate-y-0 hover:translate-y-1.5 scale-100 hover:scale-102 transform transition-all ease-out duration-600"
//             >
//               <AggloTranscribeLogo/>
//             </Link>
//             <AuthStatus />
//           </header>
          
//           <main className="relative  flex flex-col justify-start xl:justify-center p-2 sm:p-4">
//             {children}
//           </main>
          
//           <footer className="flex justify-end py-2 px-3 border-t border-gray-300 dark:border-white/10">
//             <ThemeToggle />
//           </footer>
//         </Providers>
//       </body>
//     </html>
//   );
// }