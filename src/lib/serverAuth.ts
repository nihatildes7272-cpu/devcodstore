import type { NextApiRequest } from "next";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export function getBearerToken(req: NextApiRequest) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function requireApiUser(req: NextApiRequest): Promise<User> {
  const token = getBearerToken(req);

  if (!token) {
    throw new Error("Oturum doğrulanamadı. Lütfen tekrar giriş yap.");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Oturum süresi dolmuş veya geçersiz.");
  }

  return data.user;
}
