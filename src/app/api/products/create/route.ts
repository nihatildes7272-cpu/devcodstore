import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function isValidStoragePath(path: string, userId: string) {
  if (!path) return false;
  if (path.includes("..")) return false;
  if (path.startsWith("/")) return false;
  return path.startsWith(`${userId}/`);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Giriş yapılmamış" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Kullanıcı doğrulanamadı" },
        { status: 401 }
      );
    }

    const user = userData.user;

    const body = await req.json();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price || 0);
    const category = String(body.category || "").trim();

    const quarantinePath = String(body.quarantinePath || "").trim();
    const originalFilename = String(body.originalFilename || "").trim();
    const mimeType = String(body.mimeType || "application/octet-stream").trim();
    const fileSizeBytes = Number(body.fileSizeBytes || 0);

    if (!title) {
      return NextResponse.json(
        { error: "Ürün başlığı zorunlu" },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Ürün açıklaması zorunlu" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: "Geçersiz fiyat" },
        { status: 400 }
      );
    }

    if (!isValidStoragePath(quarantinePath, user.id)) {
      return NextResponse.json(
        { error: "Geçersiz dosya yolu" },
        { status: 400 }
      );
    }

    if (!originalFilename) {
      return NextResponse.json(
        { error: "Dosya adı eksik" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
      return NextResponse.json(
        { error: "Geçersiz dosya boyutu" },
        { status: 400 }
      );
    }

    const { data: storageObject, error: storageError } = await supabaseAdmin
      .schema("storage")
      .from("objects")
      .select("id, name, bucket_id, owner")
      .eq("bucket_id", "product-quarantine")
      .eq("name", quarantinePath)
      .maybeSingle();

    if (storageError) {
      return NextResponse.json(
        {
          error: "Yüklenen dosya kontrol edilemedi",
          details: storageError.message,
        },
        { status: 500 }
      );
    }

    if (!storageObject) {
      return NextResponse.json(
        { error: "Quarantine alanında dosya bulunamadı" },
        { status: 400 }
      );
    }

    if (String(storageObject.owner) !== user.id) {
      return NextResponse.json(
        { error: "Bu dosya bu kullanıcıya ait değil" },
        { status: 403 }
      );
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .insert({
        title,
        description,
        price,
        category,
        seller_id: user.id,

        status: "pending_scan",
        scan_verdict: null,
        scan_risk_score: 0,

        quarantine_bucket: "product-quarantine",
        quarantine_path: quarantinePath,
      })
      .select("*")
      .single();

    if (productError || !product) {
      return NextResponse.json(
        {
          error: "Ürün kaydı oluşturulamadı",
          details: productError?.message,
        },
        { status: 500 }
      );
    }

    const { data: jobId, error: jobError } = await supabaseAdmin.rpc(
      "create_scan_job_for_product",
      {
        p_product_id: product.id,
        p_seller_id: user.id,
        p_quarantine_path: quarantinePath,
        p_original_filename: originalFilename,
        p_mime_type: mimeType,
        p_file_size_bytes: fileSizeBytes,
      }
    );

    if (jobError) {
      await supabaseAdmin
        .from("products")
        .update({
          status: "scan_failed",
          scan_verdict: "error",
          scan_error: jobError.message,
        })
        .eq("id", product.id);

      return NextResponse.json(
        {
          error: "Tarama işi oluşturulamadı",
          details: jobError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      product,
      scan_job_id: jobId,
      status: "pending_scan",
      message: "Ürün kaydedildi ve güvenlik taramasına alındı.",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Bilinmeyen hata oluştu";

    return NextResponse.json(
      {
        error: "Ürün oluşturma sırasında hata oluştu",
        details: message,
      },
      { status: 500 }
    );
  }
}