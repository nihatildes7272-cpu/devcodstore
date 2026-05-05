import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { checkServerRateLimit, getClientIp } from "@/lib/serverRateLimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PURCHASE_DOWNLOAD_LIMIT = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği desteklenir.",
    });
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return res.status(500).json({
      error: "Supabase environment bilgileri eksik.",
    });
  }

  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Oturum doğrulanamadı.",
    });
  }

  const accessToken = authorization.replace("Bearer ", "");
  const { productId } = req.body || {};

  if (!productId || typeof productId !== "string") {
    return res.status(400).json({
      error: "productId zorunludur.",
    });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    return res.status(401).json({
      error: "Kullanıcı doğrulanamadı.",
    });
  }

  const userId = userData.user.id;
  const clientIp = getClientIp(req.headers, req.socket.remoteAddress);

  const userLimit = await checkServerRateLimit({
    key: `user:${userId}`,
    action: "download_create_link",
    limit: 60,
    windowSeconds: 60,
  });

  if (!userLimit.allowed) {
    return res.status(429).json({
      error: "Çok fazla indirme isteği yaptın. Lütfen biraz sonra tekrar dene.",
    });
  }

  const ipLimit = await checkServerRateLimit({
    key: `ip:${clientIp}`,
    action: "download_create_link",
    limit: 120,
    windowSeconds: 60,
  });

  if (!ipLimit.allowed) {
    return res.status(429).json({
      error: "Bu IP adresinden çok fazla indirme isteği yapıldı. Lütfen biraz sonra tekrar dene.",
    });
  }

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id,user_id,product_id,status")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .neq("status", "İade Edildi")
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
      error: "Bu ürüne erişimin yok. Önce ürünü satın almalısın.",
    });
  }

  const { data: product, error: productError } = await adminClient
    .from("products")
    .select("id,title,file_path,file_name")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    return res.status(404).json({
      error: "Ürün bulunamadı.",
    });
  }

  if (!product.file_path) {
    return res.status(400).json({
      error: "Bu ürün için dosya yüklenmemiş.",
    });
  }

  const { count, error: countError } = await adminClient
    .from("product_download_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("order_id", order.id);

  if (countError) {
    return res.status(500).json({
      error: "İndirme kotası kontrol edilemedi: " + countError.message,
    });
  }

  if ((count || 0) >= PURCHASE_DOWNLOAD_LIMIT) {
    return res.status(429).json({
      error: `İndirme hakkın doldu. Satın alınan her ürün en fazla ${PURCHASE_DOWNLOAD_LIMIT} kez indirilebilir.`,
    });
  }

  const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
    .from("product-files")
    .createSignedUrl(product.file_path, 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return res.status(500).json({
      error:
        "İndirme bağlantısı oluşturulamadı: " +
        (signedUrlError?.message || "Bilinmeyen hata"),
    });
  }

  await adminClient.from("product_download_logs").insert({
    user_id: userId,
    product_id: productId,
    order_id: order.id,
    file_path: product.file_path,
    file_name: product.file_name,
    user_agent: req.headers["user-agent"] || null,
  });

  return res.status(200).json({
    signedUrl: signedUrlData.signedUrl,
    remainingDownloads: PURCHASE_DOWNLOAD_LIMIT - ((count || 0) + 1),
    downloadLimit: PURCHASE_DOWNLOAD_LIMIT,
  });
}
