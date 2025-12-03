/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function Home() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [user, setUser] = useState<any>({
    fid: 0,
    username: "anonymous",
    displayName: "Misafir",
  }); // ← BAŞLANGIÇTA NULL DEĞİL, FALLBACK VAR

  useEffect(() => {
  const init = async () => {
    if (!sdk) return;

    try {
      await sdk.actions.ready();
      setIsSDKLoaded(true);

      // Kullanıcı izni al → user bilgisi gelir
      await sdk.actions.addMiniApp();

      // Artık user dolu!
      const context = await sdk.context;
      console.log("Context loaded:", context);

      if (context?.user?.fid) {
        setUser({
          fid: context.user.fid,
          username: context.user.username || "anonymous",
          displayName: context.user.displayName || context.user.username || "User",
        });
      }
    } catch (err) {
      console.error("SDK init error:", err);
    }
  };

  init();
}, []);
  const handleCast = useCallback(async () => {
    if (!isSDKLoaded) return;

    const text = user.fid
      ? `Hello from @${user.username}! (FID: ${user.fid})`
      : "Hello World from Farcaster Miniapp";

    try {
      await sdk.actions.composeCast({ text, embeds: ["https://helloworld-six-omega.vercel.app"] });
    } catch (err) {
      console.error("Cast error:", err);
    }
  }, [isSDKLoaded, user]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-full max-w-md text-center space-y-8">

        {/* PROFİL – HER ZAMAN GÖRÜNÜR, NULL KONTROLÜ YOK */}
        <div className="bg-gradient-to-r from-purple-800 to-indigo-800 p-8 rounded-3xl shadow-2xl border-4 border-purple-500">
          <p className="text-3xl font-bold mb-2">Hoş geldin {user.displayName}!</p>
          <p className="text-2xl text-purple-200">@{user.username}</p>
          <p className="text-xl text-purple-300">FID: {user.fid}</p>
        </div>

        <h1 className="text-4xl font-bold">Miniapp Demo</h1>

        <button
          onClick={handleCast}
          disabled={!isSDKLoaded}
          className="w-full py-6 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-2xl rounded-3xl shadow-lg"
        >
          Share on Farcaster
        </button>
      </div>
    </main>
  );
}