import type { Metadata } from "next";
import { Montserrat } from 'next/font/google';
import "./globals.css";
import { Providers } from './providers';
import { ThemeToggle } from '@/app/ui/ThemeToggle';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-montserrat',     
});

export const metadata: Metadata = {
  title: "Transcripteur Audio",
  description: "Powered by Whisper",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      <body className={montserrat.className}>
        <Providers>
          <header></header>
          {children}
          <footer className="flex justify-end pb-3 pr-3">
            <ThemeToggle />
          </footer>
        </Providers>
      </body>
    </html>
  );
}
