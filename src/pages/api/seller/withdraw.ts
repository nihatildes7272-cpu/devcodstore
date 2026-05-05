import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type WithdrawBody = {
  amount: number;
  iban: string;
};

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { amount, iban } = req.body as Partial<WithdrawBody>;
  const cleanIban = typeof iban === "string" ? normalizeIban(iban) : "";

  if (typeof amount !== "number" || !Number.isFinite(amount) || !cleanIban) {
    return res
      .status(400)
      .json({ message: "Eksik bilgi gönderildi. IBAN ve Tutar zorunludur." });
  }

  if (amount <= 0) {
    return res.status(400).json({ message: "Çekim tutarı geçersiz." });
  }

  if (!/^TR\d{24}$/.test(cleanIban)) {
    return res.status(400).json({ message: "Geçerli bir TR IBAN gir." });
  }

  try {
    const user = await requireApiUser(req);

    // 1) Satıcının mevcut bakiyesini kontrol et
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("balance, account_type, seller_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: "Satıcı profili bulunamadı." });
    }

    if (profile.account_type !== "seller" || profile.seller_status !== "approved") {
      return res.status(403).json({
        message: "Para çekme talebi oluşturmak için onaylı satıcı olmalısın.",
      });
    }

    if (Number(profile.balance) < amount) {
      return res.status(400).json({
        message: `Yetersiz bakiye. Maksimum çekilebilir tutar: ${profile.balance} TL`,
      });
    }

    // 2) Bakiyeden çekilen tutarı düş
    const newBalance = Number(profile.balance) - amount;

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", user.id);

    if (updateError) {
      throw new Error("Bakiye güncellenirken bir sorun oluştu.");
    }

    // 3) Çekim talebini admin onayına sunmak için withdrawals tablosuna kaydet
    const { data: withdrawal, error: withdrawError } = await supabaseAdmin
      .from("withdrawals")
      .insert([
        {
          seller_id: user.id,
          amount: amount,
          iban: cleanIban,
          status: "Bekliyor",
        },
      ])
      .select("id,amount,iban,status,created_at")
      .single();

    if (withdrawError) {
      await supabaseAdmin
        .from("profiles")
        .update({ balance: Number(profile.balance) })
        .eq("id", user.id);
      throw withdrawError;
    }

    return res.status(200).json({
      message: "Para çekme talebiniz başarıyla alındı.",
      newBalance,
      withdrawal,
    });
  } catch (error) {
    console.error("Para çekme hatası:", error);
    const message = error instanceof Error ? error.message : "Sunucu hatası oluştu.";
    return res.status(500).json({ message });
  }
}
