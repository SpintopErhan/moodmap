//import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Yoink örneğine %100 birebir uygun JSON
  const miniAppMeta = JSON.stringify({
    version: "1",
    imageUrl: "https://moodmap-lake.vercel.app/image.png",
    button: {
      title: "Open Miniapp",
      action: {
        type: "launch_miniapp",
        name: "MoodMap",
        url: "https://moodmap-lake.vercel.app",                    
        splashImageUrl: "https://moodmap-lake.vercel.app/splash.png", 
        splashBackgroundColor: "#F7F6E1"                                   
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
        <meta property="og:image" content="https://https://moodmap-lake.vercel.app/frame_image.png" />
        <meta property="og:title" content="MoodMap" />
      </head>
      <body>{children}</body>
    </html>
  );
}

