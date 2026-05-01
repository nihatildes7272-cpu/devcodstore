import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type RateLimitInput = {
  key: string;
  action: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  currentCount: number;
  limitCount: number;
  resetAt: string;
};

export async function checkServerRateLimit({
  key,
  action,
  limit,
  windowSeconds,
}: RateLimitInput): Promise<RateLimitResult> {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Rate limit için Supabase service role bilgileri eksik.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await adminClient.rpc("check_rate_limit", {
    p_rate_key: key,
    p_action: action,
    p_limit_count: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new Error("Rate limit kontrolü yapılamadı: " + error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    allowed: Boolean(row?.allowed),
    currentCount: Number(row?.current_count || 0),
    limitCount: Number(row?.limit_count || limit),
    resetAt: String(row?.reset_at || ""),
  };
}

export function getClientIp(headers: Record<string, unknown>, fallback?: string | null) {
  const forwarded = headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return fallback || "unknown";
}
