import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Inter, JetBrains_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import UrlHider from '@/components/UrlHider';
import BackgroundManager from '@/components/BackgroundManager';
import Footer from '@/components/Footer';

import './globals.css';

const display = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: '2K Veterans League',
  description: 'NBA 2K Pro-Am league — stats, brackets, schedules, awards.',
  icons: {
    icon: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

import { NotificationProvider } from '@/components/providers/NotificationProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-navy-900 min-h-screen flex flex-col">
        <NotificationProvider>
          <BackgroundManager />
          <UrlHider />
          <Navbar />
          <main className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-8 relative z-0 flex-1 w-full">
            {children}
          </main>
          <Footer />
        </NotificationProvider>
      </body>
    </html>
  );
}

