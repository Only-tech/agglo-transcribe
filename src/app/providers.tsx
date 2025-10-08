import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="default"
            enableSystem={false}
            themes={['default', 'dark']}
            disableTransitionOnChange   
        >
            {children}
        </ThemeProvider>
    );
}
