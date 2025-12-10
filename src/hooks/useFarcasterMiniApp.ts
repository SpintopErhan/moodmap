//src\hooks\useFarcasterMiniApp.ts

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { FarcasterUser, ANONYMOUS_USER } from "@/types/farcaster";

type FarcasterSDKStatus = "idle" | "loading" | "loaded" | "error";

interface UseFarcasterMiniAppResult {
  user: FarcasterUser;
  status: FarcasterSDKStatus;
  error: Error | null;
  composeCast: (text: string, embeds?: string[]) => Promise<void>;
  sdkActions: typeof sdk.actions | null;
}

// addMiniApp çağrısının başarısız olduğunu gösteren tipik TypeError mesajını sabit olarak tanımlayalım
const ADD_MINI_APP_FAILURE_TYPE_ERROR = "Cannot read properties of undefined (reading 'result')";

export const useFarcasterMiniApp = (): UseFarcasterMiniAppResult => {
  const [user, setUser] = useState<FarcasterUser>(ANONYMOUS_USER);
  const [status, setStatus] = useState<FarcasterSDKStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const hasInitializedSDKRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (hasInitializedSDKRef.current) {
        console.log("[FarcasterSDK] init atlandı: Zaten başlatma denenmiş.");
        return;
      }

      if (!sdk) {
        const sdkError = new Error("Farcaster SDK bulunamadı veya yüklenemedi.");
        setError(sdkError);
        setStatus("error");
        console.error("[FarcasterSDK] Hata: SDK objesi yok.", sdkError);
        return;
      }

      hasInitializedSDKRef.current = true;
      setStatus("loading");
      setError(null);

      let contextFetched = false;

      try {
        console.log("[FarcasterSDK] Başlatılıyor: sdk.actions.ready() bekleniyor...");
        await sdk.actions.ready();
        console.log("[FarcasterSDK] Başarılı: sdk.actions.ready() tamamlandı.");

        try {
          console.log("[FarcasterSDK] Başlatılıyor: sdk.actions.addMiniApp() bekleniyor...");
          await sdk.actions.addMiniApp();
          console.log("[FarcasterSDK] Başarılı: sdk.actions.addMiniApp() tamamlandı.");
        } catch (addMiniAppErr: unknown) {
          // Eğer hata spesifik bir TypeError ise (Farcaster client dışında çalışıyor veya kullanıcı reddetti)
          if (addMiniAppErr instanceof TypeError && addMiniAppErr.message?.includes(ADD_MINI_APP_FAILURE_TYPE_ERROR)) {
            console.warn(
              "[FarcasterSDK] Uyarı: `addMiniApp` çağrısı başarısız oldu (Farcaster client dışında çalışıyor veya kullanıcı reddetti). Anonim olarak devam ediliyor.",
              addMiniAppErr.message
            );
            // BU HATA KRİTİK DEĞİL. UYGULAMANIN DEVAM ETMESİNE İZİN VER.
            // Bu uyarıyı UI'da göstermek istemediğimiz sürece setError çağırmayız.
          } else {
            // Farklı veya daha kritik bir hata ise, bunu ele alalım ve belki de başlatma sürecini durduralım.
            // Ancak şu anki senaryoda, biz sadece 'addMiniApp' hatalarının genel akışı bozmasını istemiyoruz.
            // Bu bloğu değiştirmiyoruz, ama eğer bilinmeyen bir hata olursa, yine de bir uyarı log'u düşmek iyi.
            console.warn("[FarcasterSDK] Uyarı: `addMiniApp` bilinmeyen bir nedenle başarısız oldu. Uygulama devam edecek.", addMiniAppErr);
            // Burada da `throw addMiniAppErr;` yapmıyoruz.
            // Böylece ana try-catch bloğuna düşmüyoruz ve status "error" olmuyor.
          }
        }

        type FarcasterSDKContext = Awaited<typeof sdk.context>;
        console.log("[FarcasterSDK] Bağlam yükleniyor: sdk.context bekleniyor...");
        const context: FarcasterSDKContext | undefined = await sdk.context;
        console.log("[FarcasterSDK] Bağlam yüklendi:", context);
        contextFetched = true;

        if (context?.user?.fid) {
          setUser({
            fid: context.user.fid,
            username: context.user.username || "anonymous",
            displayName: context.user.displayName || context.user.username || `User ${context.user.fid}`,
          });
          console.log("[FarcasterSDK] Kullanıcı bilgisi başarıyla alındı:", context.user.username);
        } else {
          console.warn("[FarcasterSDK] Uyarı: Kullanıcı bilgisi alınamadı veya kullanıcı izin vermedi. Varsayılan kullanıcı (anonim) kullanılıyor.");
          setUser(ANONYMOUS_USER); // Anonim kullanıcı olarak ayarla
        }
        
        setStatus("loaded"); // Her durumda SDK'nın "loaded" olduğunu işaretle
        console.log("[FarcasterSDK] SDK başlatma işlemi tamamlandı. Durum: loaded.");

      } catch (err: unknown) {
        // Bu catch bloğu sadece `sdk.actions.ready()` veya `sdk.context` gibi
        // gerçekten kritik olan SDK bileşenlerinde oluşan hataları yakalamalı.
        // `addMiniApp` hataları artık buraya düşmeyecek.
        console.error("[FarcasterSDK] Kritik başlatma hatası oluştu:", err);
        console.error("[FarcasterSDK] Tam hata objesi:", err instanceof Error ? err.message : String(err));
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
        console.log("[FarcasterSDK] SDK başlatma işlemi başarısız oldu. Durum: error.");

        if (!contextFetched) {
          setUser(ANONYMOUS_USER);
        }
      }
    };

    init();
  }, []);

  const composeCast = useCallback(
    async (text: string, rawEmbeds: string[] = []) => {
      if (status !== "loaded") {
        const castError = new Error("SDK yüklenmediği için cast oluşturulamadı.");
        console.warn("[FarcasterSDK] Cast hatası: SDK yüklü değil.", castError.message);
        throw castError;
      }
      if (user.fid === ANONYMOUS_USER.fid) { // ANONYMOUS_USER.fid doğrudan kontrol edildi
        const authError = new Error("Cast oluşturmak için bir Farcaster kullanıcısı olarak oturum açmış olmalısınız.");
        console.warn("[FarcasterSDK] Cast hatası: Oturum açılmamış.");
        throw authError;
      }

      let embedsForSDK: [] | [string] | [string, string] | undefined;

      if (rawEmbeds.length === 1) {
        embedsForSDK = [rawEmbeds[0]];
      } else if (rawEmbeds.length >= 2) {
        embedsForSDK = [rawEmbeds[0], rawEmbeds[1]];
        if (rawEmbeds.length > 2) {
            console.warn("[FarcasterSDK] Uyarı: Farcaster API sadece ilk 2 embed'i destekler. Fazlası göz ardı edildi.");
        }
      } else {
        embedsForSDK = undefined;
      }

      try {
        console.log("[FarcasterSDK] Cast oluşturuluyor:", { text, embeds: embedsForSDK });
        await sdk.actions.composeCast({ text, embeds: embedsForSDK });
        console.log("[FarcasterSDK] Cast başarıyla oluşturuldu.");
      } catch (err: unknown) {
        console.error("[FarcasterSDK] Cast oluşturulurken hata:", err);
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [status, user.fid]
  );

  const memoizedSdkActions = useMemo(() => (status === "loaded" ? sdk.actions : null), [status]);

  return { user, status, error, composeCast, sdkActions: memoizedSdkActions };
};