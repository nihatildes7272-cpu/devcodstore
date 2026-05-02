import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // Google Gemini API anahtarını çevre değişkenlerinden alıyoruz
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        reply: "Sistemde yapay zeka API anahtarı (GEMINI_API_KEY) bulunamadı. Lütfen .env.local dosyanı kontrol et.",
      });
    }

    // Sistem talimatı (Yapay zekanın kimliği)
    const systemPrompt = {
      parts: [
        {
          text: "Sen devcodstore adlı dijital kod, hazır web sitesi ve proje pazarının resmi yapay zeka asistanısın. Kullanıcılara nazik, yardımsever ve profesyonel bir dille destek vereceksin. Ürün satın alma, satıcı olma, dosya indirme gibi konularda kısa ve net bir şekilde yol gösterebilirsin.",
        },
      ],
    };

    // Geçmiş mesajları Gemini'nin anlayacağı formata (user/model) çeviriyoruz
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Gemini API'si sohbetin her zaman 'user' ile başlamasını bekler. 
    // Ön yüzdeki ilk "Merhaba" mesajı model'den geldiği için onu API'ye gönderirken filtreliyoruz.
    if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
      formattedHistory.shift();
    }

    // Yeni mesajı ekliyoruz
    const contents = [
      ...formattedHistory,
      { role: "user", parts: [{ text: message }] },
    ];

    // Google Gemini API'sine (gemini-1.5-flash) istek atıyoruz
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: systemPrompt,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Yapay zeka yanıt veremedi.");
    }

    // Gelen yanıtı döndürüyoruz
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reply) {
      throw new Error("Boş yanıt alındı.");
    }

    res.status(200).json({ reply });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({
      reply: "Üzgünüm, şu anda sistemsel bir yoğunluk var. Lütfen biraz sonra tekrar dene.",
    });
  }
}