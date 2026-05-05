import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { getIyzicoCallbackUrl, iyzicoPost } from "@/lib/iyzico";
import { requireApiUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CheckoutBody = {
  productIds?: unknown;
};

type CheckoutFormInitializeResponse = {
  status: "success" | "failure";
  errorMessage?: string;
  token?: string;
  paymentPageUrl?: string;
};

function parsePrice(price: string) {
  const clean = price.replace(/[^\d,.-]/g, "");
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : /\.\d{1,2}$/.test(clean)
      ? clean
      : clean.replace(/\./g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function splitName(fullName: unknown, email: string) {
  const cleanName = typeof fullName === "string" ? fullName.trim() : "";
  const fallback = email.split("@")[0] || "devcodstore";
  const parts = (cleanName || fallback).split(/\s+/).filter(Boolean);
  const name = parts[0] || "devcodstore";
  const surname = parts.slice(1).join(" ") || "Müşteri";

  return { name, surname };
}

function getClientIp(req: NextApiRequest) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "127.0.0.1"
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { productIds } = req.body as CheckoutBody;

  if (
    !productIds ||
    !Array.isArray(productIds) ||
    productIds.length === 0 ||
    !productIds.every((id) => typeof id === "string" && id.trim())
  ) {
    return res
      .status(400)
      .json({ message: "Sepetinizde ürün bulunmuyor veya geçersiz istek." });
  }

  try {
    const user = await requireApiUser(req);
    const email = user.email;

    if (!email) {
      return res.status(400).json({ message: "Ödeme için kullanıcı e-postası gerekli." });
    }

    const uniqueProductIds = Array.from(new Set(productIds.map((id) => String(id))));

    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, title, category, price, seller, seller_id")
      .eq("status", "Yayında")
      .in("id", uniqueProductIds);

    if (productError || !products || products.length !== uniqueProductIds.length) {
      return res.status(404).json({
        message:
          "Sepetteki bazı ürünler bulunamadı veya yayından kaldırılmış.",
      });
    }

    const { data: existingOrders, error: existingOrdersError } =
      await supabaseAdmin
        .from("orders")
        .select("product_id,status")
        .eq("user_id", user.id)
        .in("product_id", uniqueProductIds)
        .in("status", ["Ödeme Bekleniyor", "Tamamlandı"]);

    if (existingOrdersError) {
      throw new Error("Mevcut siparişler kontrol edilemedi: " + existingOrdersError.message);
    }

    if (existingOrders && existingOrders.length > 0) {
      return res.status(409).json({
        message:
          "Bu ürünlerden biri için zaten tamamlanmış veya bekleyen bir siparişin var.",
      });
    }

    const totalPrice = products.reduce((total, product) => total + parsePrice(product.price), 0);

    if (totalPrice <= 0) {
      return res.status(400).json({ message: "Ödeme tutarı geçersiz." });
    }

    const orderId = `ORD-${crypto.randomUUID()}`;
    const { name, surname } = splitName(user.user_metadata?.full_name, email);
    const ip = getClientIp(req);

    const ordersToInsert = products.map((product) => ({
      user_id: user.id,
      product_id: product.id,
      product_title: product.title,
      price: product.price,
      seller: product.seller,
      seller_id: product.seller_id,
      status: "Ödeme Bekleniyor",
      transaction_id: orderId,
    }));

    const { error: orderError } = await supabaseAdmin
      .from("orders")
      .insert(ordersToInsert);

    if (orderError) {
      throw new Error(
        "Sipariş veritabanına kayıt edilemedi: " + orderError.message
      );
    }

    const initializePath = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
    const initializeBody = {
      locale: "tr",
      conversationId: orderId,
      price: formatAmount(totalPrice),
      paidPrice: formatAmount(totalPrice),
      currency: "TRY",
      basketId: orderId,
      paymentGroup: "PRODUCT",
      callbackUrl: getIyzicoCallbackUrl(),
      enabledInstallments: [1],
      buyer: {
        id: user.id,
        name,
        surname,
        gsmNumber: process.env.IYZICO_DEFAULT_GSM || "+905350000000",
        email,
        identityNumber: process.env.IYZICO_DEFAULT_IDENTITY_NUMBER || "11111111111",
        registrationAddress:
          process.env.IYZICO_DEFAULT_ADDRESS || "Dijital teslimat",
        ip,
        city: process.env.IYZICO_DEFAULT_CITY || "Istanbul",
        country: process.env.IYZICO_DEFAULT_COUNTRY || "Turkey",
        zipCode: process.env.IYZICO_DEFAULT_ZIP_CODE || "34000",
      },
      billingAddress: {
        contactName: `${name} ${surname}`,
        city: process.env.IYZICO_DEFAULT_CITY || "Istanbul",
        country: process.env.IYZICO_DEFAULT_COUNTRY || "Turkey",
        address: process.env.IYZICO_DEFAULT_ADDRESS || "Dijital teslimat",
        zipCode: process.env.IYZICO_DEFAULT_ZIP_CODE || "34000",
      },
      basketItems: products.map((product) => ({
        id: product.id,
        name: product.title.substring(0, 255),
        category1: product.category || "Dijital Ürün",
        itemType: "VIRTUAL",
        price: formatAmount(parsePrice(product.price)),
      })),
    };

    const iyzicoResponse = await iyzicoPost<CheckoutFormInitializeResponse>({
      path: initializePath,
      body: initializeBody,
    });

    if (iyzicoResponse.status !== "success" || !iyzicoResponse.paymentPageUrl) {
      await supabaseAdmin
        .from("orders")
        .update({ status: "İptal Edildi / Başarısız" })
        .eq("transaction_id", orderId);

      throw new Error(
        iyzicoResponse.errorMessage || "iyzico ödeme formu başlatılamadı."
      );
    }

    return res.status(200).json({
      message: "Sipariş oluşturuldu, iyzico ödemesine yönlendiriliyorsunuz...",
      orderId,
      totalPrice,
      paymentUrl: iyzicoResponse.paymentPageUrl,
      paymentToken: iyzicoResponse.token,
    });
  } catch (error) {
    console.error("Ödeme başlatma hatası:", error);
    const message =
      error instanceof Error ? error.message : "Sunucu hatası oluştu.";
    return res.status(500).json({ message });
  }
}
