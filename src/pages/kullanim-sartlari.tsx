import SiteNavbar from "@/components/SiteNavbar";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SiteNavbar />

        <article className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Kullanım Şartları</h1>

          <p className="mt-4 text-sm text-gray-500">
            Son güncelleme: 29 Nisan 2026
          </p>

          <div className="mt-8 grid gap-7 leading-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white">1. Platformun Amacı</h2>
              <p className="mt-3">
                devcodstore; yazılım kaynak kodları, hazır web sitesi paketleri,
                admin panel tasarımları, mobil arayüz dosyaları ve dijital proje
                dosyalarının listelenip satın alınabildiği bir dijital ürün platformudur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">2. Kullanıcı Hesabı</h2>
              <p className="mt-3">
                Kullanıcılar platforma kayıt olarak ürün satın alabilir, satın aldığı
                ürünlere Dosyalarım alanından erişebilir ve hesap bilgilerini
                görüntüleyebilir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">3. Satıcı Hesabı</h2>
              <p className="mt-3">
                Satıcılar ürün bilgisi, açıklama, fiyat ve ZIP proje dosyası yükleyebilir.
                Yüklenen ürünler doğrudan yayına alınmaz; admin onayından sonra
                kullanıcı tarafında görünür.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">4. Yasaklı İçerikler</h2>
              <p className="mt-3">
                Platformda telif hakkı ihlali içeren, zararlı yazılım barındıran,
                yasa dışı işlem yapan, kullanıcı verilerini izinsiz toplayan veya
                mevzuata aykırı dijital ürünlerin yayınlanması yasaktır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">5. Dijital Teslimat</h2>
              <p className="mt-3">
                Satın alınan dijital ürünler, kullanıcının hesabına tanımlanır.
                Kullanıcı bu ürünlere Dosyalarım sayfası üzerinden erişir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">6. Değişiklik Hakkı</h2>
              <p className="mt-3">
                devcodstore, platform güvenliği ve hizmet kalitesi için kullanım
                şartlarında değişiklik yapabilir. Güncel şartlar bu sayfada yayınlanır.
              </p>
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}
