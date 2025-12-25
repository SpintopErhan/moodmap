import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Gelen veriyi oku (isteğe bağlı, loglamak için)
    const body = await request.json();
    console.log("[Webhook] Received event:", body);

    // Base App'in beklediği kritik cevap: 200 OK
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    
    // Hata olsa bile 200 dönmek bazen ekleme işleminin yarıda kalmasını önler
    // Ancak mantıksal olarak burada da başarılı bir cevap dönmek en güvenlisidir.
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

// Tarayıcıdan GET isteği atıldığında (senin yaptığın gibi) 404 yerine açıklama döner
export async function GET() {
  return NextResponse.json({ 
    status: "active", 
    message: "Farcaster/Base Webhook endpoint is running. Use POST requests." 
  });
}