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
    // Dış API'lere (Gemini, OpenAI vb.) bağlantı kaldırıldı.
    // Tamamen yerel, kurallı (rule-based) asistan mantığı eklendi.
    const lowerMessage = message.toLowerCase();
    
    // Hiçbir kural eşleşmediğinde verilecek rastgele yanıtlar
    const fallbackMessages = [
      "Üzgünüm, şu anda tam olarak ne demek istediğini anlayamıyorum. Sana ürünler veya site hakkında nasıl yardımcı olabilirim?",
      "Bunu tam olarak anlayamadım. Lütfen ürünler, satıcı olma süreci veya indirmeler hakkında bir soru sorar mısın?",
      "Bu konuda bilgim yok. Ancak devcodstore'daki dijital projeler ve kodlar hakkında seve seve yardımcı olabilirim."
    ];
    let reply = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    let redirectUrl = null;

    // Düzenli ifadeler (Regex) kullanılarak kelime dağarcığı genişletildi
    if (lowerMessage.match(/(merhaba|selam|naber|günaydın|iyi günler|iyi akşamlar)/)) {
      reply = "Merhaba! devcodstore asistanına hoş geldin. Sana nasıl yardımcı olabilirim?";
    } else if (lowerMessage.match(/(hesap|profil|bilgilerim)/)) {
      reply = "Hesap bilgilerini, siparişlerini ve ayarlarını Hesabım sayfasından yönetebilirsin. Seni oraya yönlendiriyorum...";
      redirectUrl = "/account";
    } else if (lowerMessage.match(/(giriş|kayıt|üye|oturum)/)) {
      reply = "Sitemize giriş yapmak veya yeni bir hesap oluşturmak için giriş yapma sayfasını kullanabilirsin.";
      redirectUrl = "/login";
    } else if (lowerMessage.match(/(satıcı|satış|mağaza|dükkan)/)) {
      reply = "Satıcı olmak ve kendi dijital ürünlerini satmaya başlamak için Satıcı Paneli'ne göz atabilirsin.";
      redirectUrl = "/seller";
    } else if (lowerMessage.match(/(sepet|satın|ödeme|almak istiyorum)/)) {
      reply = "Beğendiğin ürünleri sepetine ekleyip güvenle satın alabilirsin. Sepetine yönlendiriyorum...";
      redirectUrl = "/cart";
    } else if (lowerMessage.match(/(indir|dosya|kütüphane|aldıklarım|satın aldığım)/)) {
      reply = "Satın aldığın dosyalara 'Dosyalarım' sayfasından (Kütüphane) ulaşabilir ve istediğin zaman indirebilirsin.";
      redirectUrl = "/library";
    } else if (lowerMessage.match(/(iade|iptal|geri ödeme)/)) {
      reply = "Dijital ürünlerde iade işlemleri satıcının iade politikasına ve dosyayı indirip indirmediğine bağlıdır. Destek sayfasından bir bilet (ticket) oluşturabilirsin.";
      redirectUrl = "/support";
    } else if (lowerMessage.match(/(destek|yardım|iletişim|sorun|hata)/)) {
      reply = "Herhangi bir problemde veya sorunda destek sisteminden bizimle iletişime geçebilirsin. Destek sayfasına yönlendiriliyorsun...";
      redirectUrl = "/support";
    } else if (lowerMessage.match(/(kod|yazılım|proje|script|tema|şablon|ürün)/)) {
      reply = "Sitemizde birçok farklı yazılım dili ve teknolojisinde projeler mevcut. Ürünleri Keşfet sayfasından tümünü inceleyebilirsin.";
      redirectUrl = "/products";
    } else if (lowerMessage.match(/(fiyat|ücret|kaç para|ne kadar)/)) {
      reply = "Ürünlerimizin fiyatları satıcılar tarafından belirlenmektedir. İlgilendiğin ürünün detay sayfasından fiyatına ulaşabilirsin.";
    } else if (lowerMessage.match(/(favori|istek listesi|beğendiklerim|kaydettiklerim)/)) {
      reply = "Beğendiğin ve kaydettiğin ürünleri İstek Listesi sayfasında bulabilirsin. Seni oraya yönlendiriyorum...";
      redirectUrl = "/favorites";
    } else if (lowerMessage.match(/(ara|bul|nasıl bulurum)/)) {
      reply = "İhtiyacın olan ürünleri bulmak için sayfanın üst kısmındaki arama çubuğunu kullanabilir veya kategorilere göz atabilirsin.";
    } else if (lowerMessage.match(/(nedir|kimdir|hakkında)/)) {
      reply = "devcodstore; yazılımcıların ve tasarımcıların kendi dijital ürünlerini (kod, tema, e-kitap vb.) güvenle satabileceği ve ihtiyaç duydukları projeleri satın alabileceği bir dijital pazaryeridir.";
      redirectUrl = "/about";
    } else if (lowerMessage.match(/(ödeme yöntemleri|kredi kartı|taksit|havale|banka kartı)/)) {
      reply = "Sitemizde kredi kartı ve banka kartı ile güvenli bir şekilde (3D Secure destekli) ödeme yapabilirsin. Satın alım sonrası ürünler anında hesabına tanımlanır.";
    } else if (lowerMessage.match(/(teşekkür|sağ ol|eyvallah)/)) {
      reply = "Rica ederim! Başka bir sorunun olursa ben buralardayım.";
    }

    res.status(200).json({ reply, redirectUrl });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({
      reply: "Üzgünüm, şu anda sistemsel bir yoğunluk var. Lütfen biraz sonra tekrar dene.",
    });
  }
}