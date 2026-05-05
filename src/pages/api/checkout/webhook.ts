import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { iyzicoPost } from "@/lib/iyzico";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type IyzicoCallbackBody = {
  token?: string;
};

type CheckoutFormRetrieveResponse = {
  status: "success" | "failure";
  errorMessage?: string;
  conversationId?: string;
  basketId?: string;
  paymentStatus?: "SUCCESS" | "FAILURE" | string;
  paymentId?: string;
};

type SoldOrder = {
  product_title: string;
  price: string;
  seller_id: string | null;
  user_id: string;
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

async function sendPaymentEmails({
  merchantOid,
  soldOrders,
  buyerEmail,
  failedReason,
}: {
  merchantOid: string;
  soldOrders: SoldOrder[];
  buyerEmail?: string | null;
  failedReason?: string;
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  if (failedReason && buyerEmail) {
    await transporter.sendMail({
      from: `"devcodstore" <${smtpUser}>`,
      to: buyerEmail,
      subject: "Ödeme İşlemin Başarısız Oldu",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #dc2626;">Merhaba,</h2>
          <p><strong>${merchantOid}</strong> numaralı siparişin için ödeme alınamadı.</p>
          <p><strong>Hata Nedeni:</strong> ${failedReason}</p>
          <p>Lütfen sepetinden tekrar ödeme başlatmayı dene.</p>
        </div>
      `,
    });
    return;
  }

  if (buyerEmail) {
    await transporter.sendMail({
      from: `"devcodstore" <${smtpUser}>`,
      to: buyerEmail,
      subject: "Siparişin Başarıyla Onaylandı",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #2563eb;">Merhaba,</h2>
          <p><strong>${merchantOid}</strong> numaralı siparişinin ödemesi başarıyla alındı.</p>
          <p>Satın aldığın dijital ürünlere giriş yaptıktan sonra <strong>Dosyalarım</strong> bölümünden erişebilirsin.</p>
        </div>
      `,
    });
  }

  for (const order of soldOrders) {
    if (!order.seller_id) continue;

    const { data: sellerProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", order.seller_id)
      .single();

    if (!sellerProfile?.email) continue;

    await transporter.sendMail({
      from: `"devcodstore Satıcı Merkezi" <${smtpUser}>`,
      to: sellerProfile.email,
      subject: "Yeni Bir Satış Yaptın",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #16a34a;">Tebrikler!</h2>
          <p><strong>${order.product_title}</strong> adlı ürünün satıldı.</p>
          <p><strong>Kazanılan Tutar:</strong> ${order.price}</p>
        </div>
      `,
    });
  }
}

async function getBuyerEmail(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  return data?.email || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const body = req.body as Partial<IyzicoCallbackBody>;
    const token =
      typeof body?.token === "string"
        ? body.token
        : typeof req.query.token === "string"
          ? req.query.token
          : "";

    if (!token) {
      return res.status(400).send("iyzico callback failed: missing token");
    }

    const retrievePath = "/payment/iyzipos/checkoutform/auth/ecom/detail";
    const paymentResult = await iyzicoPost<CheckoutFormRetrieveResponse>({
      path: retrievePath,
      body: {
        locale: "tr",
        token,
      },
    });

    const merchantOid = paymentResult.conversationId || paymentResult.basketId;

    if (!merchantOid) {
      return res.status(400).send("iyzico callback failed: missing conversationId");
    }

    const { data: existingOrders, error: existingOrdersError } =
      await supabaseAdmin
        .from("orders")
        .select("product_title,price,seller_id,user_id,status")
        .eq("transaction_id", merchantOid);

    if (existingOrdersError) {
      console.error("iyzico orders fetch error:", existingOrdersError);
      return res.status(500).send("Internal Server Error");
    }

    const soldOrders = (existingOrders || []) as SoldOrder[];
    const existingStatus = existingOrders?.[0]?.status;
    const buyerEmail = soldOrders[0]?.user_id
      ? await getBuyerEmail(soldOrders[0].user_id)
      : null;

    if (existingStatus === "Tamamlandı" || existingStatus === "İptal Edildi / Başarısız") {
      return res.redirect(302, existingStatus === "Tamamlandı" ? "/success/cart" : "/checkout/cart");
    }

    if (paymentResult.status !== "success" || paymentResult.paymentStatus !== "SUCCESS") {
      const { error: failUpdateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "İptal Edildi / Başarısız" })
        .eq("transaction_id", merchantOid);

      if (failUpdateError) {
        console.error("iyzico fail update error:", failUpdateError);
        return res.status(500).send("Internal Server Error");
      }

      try {
        await sendPaymentEmails({
          merchantOid,
          soldOrders,
          buyerEmail,
          failedReason: paymentResult.errorMessage || "iyzico ödeme sonucu başarısız.",
        });
      } catch (emailError) {
        console.error("iyzico failure email error:", emailError);
      }

      return res.redirect(302, "/checkout/cart");
    }

    for (const order of soldOrders) {
      if (!order.seller_id) continue;

      const { data: sellerProfile, error: sellerProfileError } =
        await supabaseAdmin
          .from("profiles")
          .select("balance")
          .eq("id", order.seller_id)
          .single();

      if (sellerProfileError) {
        console.error("iyzico seller profile fetch error:", sellerProfileError);
        return res.status(500).send("Internal Server Error");
      }

      const newBalance = (Number(sellerProfile.balance) || 0) + parsePrice(order.price);
      const { error: balanceUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", order.seller_id);

      if (balanceUpdateError) {
        console.error("iyzico seller balance update error:", balanceUpdateError);
        return res.status(500).send("Internal Server Error");
      }
    }

    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "Tamamlandı" })
      .eq("transaction_id", merchantOid);

    if (orderUpdateError) {
      console.error("iyzico orders update error:", orderUpdateError);
      return res.status(500).send("Internal Server Error");
    }

    if (soldOrders[0]?.user_id) {
      const { error: cartDeleteError } = await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("user_id", soldOrders[0].user_id);

      if (cartDeleteError) {
        console.error("iyzico cart delete error:", cartDeleteError);
      }
    }

    try {
      await sendPaymentEmails({ merchantOid, soldOrders, buyerEmail });
    } catch (emailError) {
      console.error("iyzico email error:", emailError);
    }

    return res.redirect(302, "/success/cart");
  } catch (error) {
    console.error("iyzico callback error:", error);
    return res.status(500).send("Internal Server Error");
  }
}
