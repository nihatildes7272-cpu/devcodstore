import SiteNavbar from "@/components/SiteNavbar";

export default function SellerRulesPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SiteNavbar />

        <article className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Satıcı Kuralları</h1>

          <p className="mt-4 text-sm text-gray-500">
            Son güncelleme: 29 Nisan 2026
          </p>

          <div className="mt-8 grid gap-7 leading-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white">1. Ürün Yükleme</h2>
              <p className="mt-3">
                Satıcılar ürün adı, kategori, fiyat, açıklama ve ZIP dosyası yükleyerek
                ürünlerini admin onayına gönderebilir. Ürünler onaylanmadan yayına alınmaz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">2. Dosya İçeriği</h2>
              <p className="mt-3">
                Yüklenen dosyalar açıklamada belirtilen ürünle uyumlu olmalıdır.
                Bozuk, eksik, yanıltıcı veya zararlı dosyalar platformdan kaldırılabilir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">3. Yasaklı Ürünler</h2>
              <p className="mt-3">
                Zararlı yazılım, izinsiz veri toplama aracı, telif hakkı ihlali içeren
                kaynak kodu, yasa dışı işlem yapan scriptler veya kullanıcılara zarar
                verebilecek yazılımlar platformda yayınlanamaz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">4. Ürün Güncelleme</h2>
              <p className="mt-3">
                Satıcı ürününü düzenlediğinde ürün tekrar admin onayına düşer.
                Admin onayından sonra tekrar yayına alınır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">5. Satış ve Kazanç</h2>
              <p className="mt-3">
                Satıcı panelinde ürünlerden gelen siparişler ve kazanç bilgileri
                görüntülenebilir. Gerçek ödeme entegrasyonu aktif edildiğinde ödeme
                ve komisyon süreçleri ayrıca netleştirilecektir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">6. Admin Yetkisi</h2>
              <p className="mt-3">
                devcodstore, platform güvenliği için ürünleri onaylama, reddetme,
                beklemeye alma veya yayından kaldırma hakkını saklı tutar.
              </p>
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}
