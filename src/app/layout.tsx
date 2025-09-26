import type {Metadata} from 'next';
import { Inter, Kalam } from "next/font/google";
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

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
    <html lang="en" className="antialiased">
      <body className={`${inter.variable} ${kalam.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
