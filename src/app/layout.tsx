// app/layout.tsx → BU DOSYA İLE KESİN BİTECEK

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Yoink örneğine %100 birebir uygun JSON
  const miniAppMeta = JSON.stringify({
    version: "1",
    imageUrl: "https://helloworld-six-omega.vercel.app/frame_image.png",
    button: {
      title: "Open Miniapp",
      action: {
        type: "launch_miniapp",
        name: "Hello World Miniapp",
        url: "https://helloworld-six-omega.vercel.app",                    // ekledik
        splashImageUrl: "https://helloworld-six-omega.vercel.app/frame_image.png", // ekledik
        splashBackgroundColor: "#1e1b4b"                                   // koyu mor
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
        <meta property="og:image" content="https://helloworld-six-omega.vercel.app/frame_image.png" />
        <meta property="og:title" content="Hello World Miniapp" />
      </head>
      <body>{children}</body>
    </html>
  );
}