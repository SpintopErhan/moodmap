// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      // <<< BURAYA YENİ TANIMLAMALAR EKLENDİ >>>
      keyframes: {
        pulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' }, // Başlangıç ve bitiş durumu
          '50%': { transform: 'scale(1.05)', opacity: '0.9' }, // Ortada hafifçe büyüyüp daha opak olur
        },
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', // Animasyon süresi, eğrisi ve sonsuz döngü
      },
      // <<< YENİ TANIMLAMALAR BİTTİ >>>
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;