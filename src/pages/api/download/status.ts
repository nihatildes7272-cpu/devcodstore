import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DEFAULT_DOWNLOAD_LIMIT = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği desteklenir.",
    });
  }

  const { productId } = req.body || {};

  if (!productId || typeof productId !== "string") {
    return res.status(400).json({
      error: "productId zorunludur.",
    });
  }

  try {
    const user = await requireApiUser(req);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id,user_id,product_id,status,download_limit")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "Tamamlandı")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      return res.status(500).json({
        error: "Sipariş kontrolü yapılamadı: " + orderError.message,
      });
    }

    if (!order) {
      return res.status(403).json({
        error: "Bu ürüne erişimin yok. İndirme için ödeme tamamlanmış olmalı.",
      });
    }

    const downloadLimit =
      typeof order.download_limit === "number" && order.download_limit > 0
        ? order.download_limit
        : DEFAULT_DOWNLOAD_LIMIT;

    const { count, error: countError } = await supabaseAdmin
      .from("product_download_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("order_id", order.id);

    if (countError) {
      return res.status(500).json({
        error: "İndirme kotası kontrol edilemedi: " + countError.message,
      });
    }

    const usedDownloads = count || 0;
    const remainingDownloads = Math.max(0, downloadLimit - usedDownloads);

    return res.status(200).json({
      orderId: order.id,
      downloadLimit,
      usedDownloads,
      remainingDownloads,
      canDownload: remainingDownloads > 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Oturum doğrulanamadı.";
    return res.status(401).json({ error: message });
  }
}
