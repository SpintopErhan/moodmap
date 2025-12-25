"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk"; // Doğru ve güncel paket
import { FarcasterUser, ANONYMOUS_USER } from "@/types/farcaster";

type FarcasterSDKStatus = "idle" | "loading" | "loaded" | "error";

interface UseFarcasterMiniAppResult {
  user: FarcasterUser;
  status: FarcasterSDKStatus;
  error: Error | null;
  composeCast: (text: string, embeds?: string[]) => Promise<void>;
  sdkActions: typeof sdk.actions | null;
}

const DEFAULT_APP_EMBED_URL = "https://moodmap-lake.vercel.app";

export const useFarcasterMiniApp = (
  appEmbedUrl: string = DEFAULT_APP_EMBED_URL
): UseFarcasterMiniAppResult => {
  const [user, setUser] = useState<FarcasterUser>(ANONYMOUS_USER);
  const [status, setStatus] = useState<FarcasterSDKStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const hasInitializedSDKRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (hasInitializedSDKRef.current) return;

      hasInitializedSDKRef.current = true;
      setStatus("loading");

      try {
        console.log("[FarcasterSDK] Initializing sdk.actions.ready()...");
        
        // 1. SDK'yı hazırla
        await sdk.actions.ready({
            disableNativeGestures: true
        });

        // 2. Context'i bekle (Base App uyumluluğu için kritik)
        console.log("[FarcasterSDK] Fetching context...");
        const context = await sdk.context;
        
        if (context?.user?.fid) {
          setUser({
            fid: context.user.fid,
            username: context.user.username || "anonymous",
            displayName: context.user.displayName || context.user.username || `User ${context.user.fid}`,
          });
        }

        // 3. Mini App ekleme isteği (Warpcast/Base App Apps sekmesi için)
        try {
          console.log("[FarcasterSDK] Attempting addMiniApp...");
          await sdk.actions.addMiniApp();
        } catch (addErr) {
          // addMiniApp hatası kritik değildir, akışı bozmamalı
          console.warn("[FarcasterSDK] addMiniApp handled:", addErr);
        }

        setStatus("loaded");
      } catch (err: unknown) {
        console.error("[FarcasterSDK] Initialization error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
      }
    };

    init();
  }, []);

  const composeCast = useCallback(
    async (text: string, rawEmbeds: string[] = []) => {
      if (status !== "loaded") throw new Error("SDK not loaded");
      
      const finalEmbeds = [...rawEmbeds];
      if (!finalEmbeds.includes(appEmbedUrl)) {
          finalEmbeds.unshift(appEmbedUrl);
      }

      // Farcaster max 2 embeds limit
      const embedsForSDK = finalEmbeds.slice(0, 2) as [string, string] | [string] | [];

      try {
        await sdk.actions.composeCast({ 
          text, 
          embeds: embedsForSDK.length > 0 ? embedsForSDK : undefined 
        });
      } catch (err: unknown) {
        console.error("[FarcasterSDK] composeCast error:", err);
        throw err;
      }
    },
    [status, appEmbedUrl]
  );

  const memoizedSdkActions = useMemo(() => (status === "loaded" ? sdk.actions : null), [status]);

  return { user, status, error, composeCast, sdkActions: memoizedSdkActions };
};