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

export const useFarcasterMiniApp = (): UseFarcasterMiniAppResult => {
  const [user, setUser] = useState<FarcasterUser>(ANONYMOUS_USER);
  const [status, setStatus] = useState<FarcasterSDKStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  // SDK başlatma işleminin sadece bir kez yapılmasını sağlamak için useRef kullanıldı
  const hasInitializedSDKRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      // Eğer SDK zaten başlatılmaya çalışıldıysa, tekrar çalıştırma
      if (hasInitializedSDKRef.current) {
        console.log("[FarcasterSDK] init atlandı: Zaten başlatma denenmiş.");
        return;
      }

      // SDK objesi henüz tanımlı değilse
      if (!sdk) {
        const sdkError = new Error("Farcaster SDK bulunamadı veya yüklenemedi.");
        setError(sdkError);
        setStatus("error");
        console.error("[FarcasterSDK] Hata: SDK objesi yok.", sdkError);
        return;
      }

      // Başlatma işlemini işaretle
      hasInitializedSDKRef.current = true;
      setStatus("loading");
      setError(null); // Önceki hataları temizle

      let contextFetched = false; // context'in başarılı şekilde alınıp alınmadığını takip edelim

      try {
        console.log("[FarcasterSDK] Başlatılıyor: sdk.actions.ready() bekleniyor...");
        await sdk.actions.ready();
        console.log("[FarcasterSDK] Başarılı: sdk.actions.ready() tamamlandı.");

        try {
          console.log("[FarcasterSDK] Başlatılıyor: sdk.actions.addMiniApp() bekleniyor...");
          await sdk.actions.addMiniApp();
          console.log("[FarcasterSDK] Başarılı: sdk.actions.addMiniApp() tamamlandı.");
          // Eğer burası başarılı olursa, muhtemelen bir Farcaster client içindeyiz.
        } catch (addMiniAppErr: unknown) { // 'any' -> 'unknown' olarak değiştirildi
          // `TypeError: Cannot read properties of undefined (reading 'result')` hatasını özel olarak ele al
          // Bu hata genellikle bir Farcaster client'ı içinde olmadığımızda ortaya çıkar.
          if (addMiniAppErr instanceof TypeError && addMiniAppErr.message?.includes("result")) {
            console.warn(
              "[FarcasterSDK] Uyarı: `addMiniApp` çağrısı başarısız oldu (muhtemelen Farcaster client dışında çalışıyor). Uygulama devam edecek.",
              addMiniAppErr.message
            );
            // Bu spesifik hatayı kritik olarak işaretlemiyoruz, ancak genel bir hata log'u tutabiliriz.
            // setError(addMiniAppErr); // Eğer UI'da bu spesifik uyarıyı göstermek istersen bu satırı açabilirsin.
          } else {
            // Farklı veya daha kritik bir hata ise, başlatma sürecini durdur.
            console.error("[FarcasterSDK] Kritik hata: `addMiniApp` bilinmeyen bir nedenle başarısız oldu.", addMiniAppErr);
            throw addMiniAppErr; // Dış catch bloğuna atarız.
          }
        }

        type FarcasterSDKContext = Awaited<typeof sdk.context>;
        console.log("[FarcasterSDK] Bağlam yükleniyor: sdk.context bekleniyor...");
        const context: FarcasterSDKContext | undefined = await sdk.context;
        console.log("[FarcasterSDK] Bağlam yüklendi:", context);
        contextFetched = true; // Context başarılı bir şekilde alındı.

        if (context?.user?.fid) {
          setUser({
            fid: context.user.fid,
            username: context.user.username || "anonymous",
            displayName: context.user.displayName || context.user.username || `User ${context.user.fid}`,
          });
          console.log("[FarcasterSDK] Kullanıcı bilgisi başarıyla alındı:", context.user.username);
        } else {
          console.warn("[FarcasterSDK] Uyarı: Kullanıcı bilgisi alınamadı veya kullanıcı izin vermedi. Varsayılan kullanıcı kullanılıyor.");
          setUser(ANONYMOUS_USER);
        }
        setStatus("loaded");
        console.log("[FarcasterSDK] SDK başlatma işlemi tamamlandı. Durum: loaded.");
      } catch (err: unknown) { // Buradaki 'err' tipi de 'unknown' olarak değiştirildi, iyi bir pratik.
        console.error("[FarcasterSDK] Kritik başlatma hatası oluştu:", err);
        // Hata objesini doğru bir şekilde loglamak için:
        console.error("[FarcasterSDK] Tam hata objesi:", err instanceof Error ? err.message : String(err));
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
        console.log("[FarcasterSDK] SDK başlatma işlemi başarısız oldu. Durum: error.");

        // Eğer context hiç alınamadıysa, kullanıcıyı yine de ANONİM olarak ayarla,
        // böylece UI'da boş bir kullanıcı objesi yerine varsayılan bir kullanıcı gösterilir.
        if (!contextFetched) {
          setUser(ANONYMOUS_USER);
        }
      }
    };

    init();
  }, []); // Boş bağımlılık dizisi, hook'un sadece mount olduğunda çalışmasını sağlar.

  const composeCast = useCallback(
    async (text: string, rawEmbeds: string[] = []) => {
      if (status !== "loaded") {
        const castError = new Error("SDK yüklenmediği için cast oluşturulamadı.");
        console.warn("[FarcasterSDK] Cast hatası: SDK yüklü değil.", castError.message);
        throw castError;
      }
      if (!user.fid || user.fid === 0) { // Anonim kullanıcı cast yapamaz
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
      } catch (err: unknown) { // Buradaki 'err' tipi de 'unknown' olarak değiştirildi
        console.error("[FarcasterSDK] Cast oluşturulurken hata:", err);
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [status, user.fid] // user.fid eklendi, çünkü cast yapabilmek için kullanıcı bilgisi önemli.
  );

  const memoizedSdkActions = useMemo(() => (status === "loaded" ? sdk.actions : null), [status]);

  return { user, status, error, composeCast, sdkActions: memoizedSdkActions };
};