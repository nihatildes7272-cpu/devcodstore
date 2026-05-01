import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Sadece GET isteği desteklenir.",
    });
  }

  if (!supabaseUrl || !serviceRoleKey || !cronSecret) {
    return res.status(500).json({
      error: "Cron için gerekli environment bilgileri eksik.",
    });
  }

  const authorization = req.headers.authorization;

  if (authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      error: "Yetkisiz cron isteği.",
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const summary: Record<string, number | string> = {};

    const rateLimitResult = await adminClient
      .from("api_rate_limits")
      .delete({ count: "exact" })
      .lt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    summary.deleted_rate_limits = rateLimitResult.count || 0;

    const readNotificationsResult = await adminClient
      .from("notifications")
      .delete({ count: "exact" })
      .eq("is_read", true)
      .lt("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    summary.deleted_read_notifications = readNotificationsResult.count || 0;

    const downloadLogsResult = await adminClient
      .from("product_download_logs")
      .delete({ count: "exact" })
      .lt("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

    summary.deleted_download_logs = downloadLogsResult.count || 0;

    const scanJobsResult = await adminClient
      .from("security_scan_jobs")
      .delete({ count: "exact" })
      .in("status", ["completed", "failed", "cancelled"])
      .lt("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    summary.deleted_scan_jobs = scanJobsResult.count || 0;

    const heartbeatsResult = await adminClient
      .from("scanner_worker_heartbeats")
      .delete({ count: "exact" })
      .lt("last_seen_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    summary.deleted_heartbeats = heartbeatsResult.count || 0;

    const adminLogsResult = await adminClient
      .from("admin_logs")
      .delete({ count: "exact" })
      .lt("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    summary.deleted_old_admin_logs = adminLogsResult.count || 0;
    summary.finished_at = new Date().toISOString();

    await adminClient.from("system_maintenance_runs").insert({
      actor_id: null,
      action: "cron_cleanup",
      summary,
    });

    return res.status(200).json({
      ok: true,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Sistem temizliği sırasında bilinmeyen hata oluştu.",
    });
  }
}
