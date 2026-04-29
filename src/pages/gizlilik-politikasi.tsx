import SiteNavbar from "@/components/SiteNavbar";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SiteNavbar />

        <article className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Gizlilik Politikası</h1>

          <p className="mt-4 text-sm text-gray-500">
            Son güncelleme: 29 Nisan 2026
          </p>

          <div className="mt-8 grid gap-7 leading-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white">1. Genel Bilgilendirme</h2>
              <p className="mt-3">
                devcodstore, dijital yazılım ürünleri, kaynak kodları, admin panel
                paketleri, arayüz dosyaları ve ZIP formatındaki proje dosyalarının
                listelenip satın alınabildiği bir dijital ürün platformudur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">2. Toplanan Bilgiler</h2>
              <p className="mt-3">
                Platformda hesap oluşturma, giriş yapma, ürün satın alma, satıcı
                başvurusu ve ürün yükleme işlemleri sırasında ad-soyad, e-posta
                adresi, hesap türü, satın alma kayıtları, ürün bilgileri ve teknik
                işlem kayıtları işlenebilir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">3. Verilerin Kullanım Amacı</h2>
              <p className="mt-3">
                Veriler; kullanıcı hesabı oluşturmak, giriş işlemlerini sağlamak,
                satın alınan dijital ürünlere erişim vermek, satıcı ürünlerini
                yönetmek, destek taleplerini değerlendirmek ve platform güvenliğini
                sağlamak amacıyla kullanılır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">4. Ödeme Bilgileri</h2>
              <p className="mt-3">
                Gerçek ödeme altyapısı aktif edildiğinde kart bilgileri devcodstore
                tarafından saklanmayacaktır. Ödeme işlemleri, yetkili ödeme kuruluşu
                üzerinden güvenli şekilde gerçekleştirilecektir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">5. Dosya ve Ürün Erişimi</h2>
              <p className="mt-3">
                Kullanıcılar yalnızca satın aldıkları dijital ürünlerin dosyalarına
                erişebilir. Satın alma kontrolü sistem tarafından yapılır ve satın
                alınmamış ürün dosyalarına erişim engellenir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white">6. İletişim</h2>
              <p className="mt-3">
                Gizlilik politikasıyla ilgili sorular için iletişim sayfası üzerinden
                bizimle iletişime geçilebilir.
              </p>
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}
