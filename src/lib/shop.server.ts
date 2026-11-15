import { createClient } from "@supabase/supabase-js";
import { useSession } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

export type OwnerSession = { password?: string };

export function makePublicClient(url: string, key: string) {
  const fetchWithPublishableKey: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };

  return createClient<Database>(url, key, {
    global: { fetch: fetchWithPublishableKey },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export function ownerSession(sessionSecret: string) {
  return useSession<OwnerSession>({
    password: sessionSecret,
    name: "toss-owner-session",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}
