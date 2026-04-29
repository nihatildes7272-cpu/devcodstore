import SiteNavbar from "@/components/SiteNavbar";

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SiteNavbar />

        <article className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">İade Politikası</h1>

          <p className="mt-4 text-sm text-gray-500">
            Son güncelleme: 29 Nisan 2026
          </p>

          <div className="mt-8 grid gap-7 leading-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white">1. Dijital Ürün Niteliği</h2>
              <p className="mt-3">
                devcodstore üzerinden satılan ürünler fiziksel ürün değildir.
                Ürünler kaynak kodu, arayüz dosyası, admin panel paketi veya ZIP
                formatındaki dijital proje dosyalarından oluşur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">2. Teslimat Şekli</h2>
              <p className="mt-3">
                Satın alma işlemi tamamlandıktan sonra ürün kullanıcının hesabına
                tanımlanır ve Dosyalarım sayfasından indirilebilir hale gelir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">3. İade Değerlendirmesi</h2>
              <p className="mt-3">
                Dijital ürünlerde iade talepleri; ürünün indirilip indirilmediği,
                teknik bir sorun olup olmadığı ve ürün açıklamasının gerçeği yansıtıp
                yansıtmadığı dikkate alınarak değerlendirilir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">4. Teknik Sorunlar</h2>
              <p className="mt-3">
                Satın alınan dosyaya erişim sağlanamaması, indirme bağlantısı problemi
                veya hatalı dosya yüklenmesi gibi durumlarda kullanıcı destek talebi
                oluşturabilir. Gerekli kontroller yapılarak çözüm sağlanır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">5. Destek</h2>
              <p className="mt-3">
                İade veya destek talepleri için kullanıcılar iletişim sayfasından
                devcodstore ekibine ulaşabilir.
              </p>
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}
