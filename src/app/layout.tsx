import type { Metadata } from 'next';
import { Roboto, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { CurrencyProvider } from '@/context/CurrencyContext';

const fontSans = Roboto({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '700'],
});

const fontHeadline = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['700'],
});

export const metadata: Metadata = {
  title: 'TrueNorth',
  description: 'A modern CRM for your business needs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-sans antialiased dark", fontSans.variable, fontHeadline.variable)}>
        <AuthProvider>
          <CurrencyProvider>
            {children}
            <Toaster />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
