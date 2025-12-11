// Eğer @farcaster/miniapp-sdk kütüphanesi MiniAppUser tipi sağlıyorsa onu kullanabiliriz.
// import type { MiniAppUser } from "@farcaster/miniapp-sdk";
// Eğer sağlamıyorsa veya daha spesifik bir tip istiyorsak:

//src/types/farcaster.ts

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
}

export const ANONYMOUS_USER: FarcasterUser = {
  fid: 0,
  username: "anonymous",
  displayName: "Misafir",
};