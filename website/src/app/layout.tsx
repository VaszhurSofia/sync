import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import StagingRibbon from '../components/StagingRibbon';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sync - AI-Powered Couple Communication',
  description: 'Transform your relationship with AI-powered reflection, clarification, and micro-actions. Built with privacy and safety at its core.',
  keywords: ['couple communication', 'AI relationship', 'privacy', 'safety', 'relationship therapy'],
  authors: [{ name: 'Sync Team' }],
  robots: process.env.STAGING === 'true' ? 'noindex,nofollow' : 'index, follow',
  openGraph: {
    title: 'Sync - AI-Powered Couple Communication',
    description: 'Transform your relationship with AI-powered reflection, clarification, and micro-actions.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sync - AI-Powered Couple Communication',
    description: 'Transform your relationship with AI-powered reflection, clarification, and micro-actions.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StagingRibbon />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
          {children}
        </div>
      </body>
    </html>
  );
}
