import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  console.error("KALYNO Admin: configure VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans .env.local");
}

export const supabase = createClient(url ?? "", key ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
