// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] }); // 'inter' burada tanımlanıyor

export const metadata: Metadata = {
  title: 'MoodMap MiniApp',
  description: 'Farcaster MiniApp for ModdMap',
  // 👇 BASE APP ID BURAYA EKLENİYOR 👇
  other: {
    'base:app_id': '6944e10cd19763ca26ddc4d2',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const miniAppMeta = JSON.stringify({
    version: "1",
    imageUrl: "https://moodmap-lake.vercel.app/frame_image.png",
    button: {
      title: "Open MoodMap",
      action: {
        type: "launch_miniapp",
        name: "MoodMap",
        url: "https://moodmap-lake.vercel.app",                    
        splashImageUrl: "https://moodmap-lake.vercel.app/splash.png", 
        splashBackgroundColor: "#F8F6E1"                                    
      }
    }
  });

  return (
    <html lang="en">
      <head>
        {/* ASIL ÖNEMLİ OLAN BU SATIR */}
        <meta name="fc:miniapp" content={miniAppMeta} />

        {/* Geriye uyumluluk – dokümanda var */}
        <meta name="fc:frame" content={miniAppMeta.replace('launch_miniapp', 'launch_frame')} />

        {/* OG */}
        <meta property="og:image" content="https://moodmap-lake.vercel.app/frame_image.png" />
        <meta property="og:title" content="MoodMap" />
      </head>
      {/* Hata çözümü: inter.className'i <body> etiketine ekleyin */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}