import { createClient } from "@supabase/supabase-js";

export const REMEMBER_KEY = "aaa-remember";
export const REMEMBER_USER_KEY = "aaa-user";

const memory = new Map<string, string>();

function remembered() {
  return localStorage.getItem(REMEMBER_KEY) !== "0";
}

const authStorage = {
  getItem(key: string) {
    if (typeof window === "undefined") return memory.get(key) ?? null;
    return (remembered() ? localStorage : sessionStorage).getItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof window === "undefined") { memory.set(key, value); return; }
    const store = remembered() ? localStorage : sessionStorage;
    const other = remembered() ? sessionStorage : localStorage;
    other.removeItem(key);
    store.setItem(key, value);
  },
  removeItem(key: string) {
    if (typeof window === "undefined") { memory.delete(key); return; }
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
