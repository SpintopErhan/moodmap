// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// NEXT_PUBLIC_ öneki, bu değişkenlerin istemci tarafında erişilebilir olmasını sağlar.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase URL veya Anon Key tanımlanmamış. Lütfen .env.local dosyanızı kontrol edin."
  );
  // Hata durumunda uygulamanın davranışını burada yönetebilirsiniz.
  // Örneğin, bir hata mesajı gösterebilir veya uygulamanın bazı özelliklerini devre dışı bırakabilirsiniz.
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

console.log("[supabase.ts] Supabase client initialized.");