import type {Metadata} from 'next';
import { Inter, Kalam } from "next/font/google";
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Link from 'next/link';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const kalam = Kalam({ subsets: ["latin"], weight: "700", variable: "--font-kalam" });

export const metadata: Metadata = {
  title: 'TT Path',
  description: 'Your adventure to joining the Trading Tribe begins here.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className={`${inter.variable} ${kalam.variable} font-sans`}>
        {children}
        <Toaster />
        <footer className="py-4 text-center text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span className="mx-2">|</span>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </footer>
      </body>
    </html>
  );
}
