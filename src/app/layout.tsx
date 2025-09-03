import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import MusicController from '@/features/town/components/MusicController';
import MusicControls from '@/features/town/components/MusicControls';

export const metadata: Metadata = {
  title: 'BarQuest',
  description: 'An ultra-readable ARPG by Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
        <MusicController />
        <MusicControls />
      </body>
    </html>
  );
}
