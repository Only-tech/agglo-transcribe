import type { Metadata } from "next";
import { Montserrat } from 'next/font/google';
import "./globals.css";
import { Providers } from './providers';

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
      <body className={montserrat.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
