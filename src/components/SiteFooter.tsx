export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#070A12] px-6 pb-10 text-white">
      <section className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
                D
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  devcodstore
                </h2>
                <p className="text-xs text-gray-400">
                  Kod, proje ve web sistemleri pazarı
                </p>
              </div>
            </a>

            <p className="mt-5 text-sm leading-7 text-gray-400">
              devcodstore; hazır web sitesi kodları, admin panel paketleri,
              mobil arayüz dosyaları ve dijital proje paketleri için geliştirilen
              modern bir kod pazarı platformudur.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Platform</h3>

            <div className="mt-4 grid gap-3 text-sm text-gray-400">
              <a href="/products" className="hover:text-white">
                Ürünler
              </a>

              <a href="/seller" className="hover:text-white">
                Satıcı Ol
              </a>

              <a href="/library" className="hover:text-white">
                Dosyalarım
              </a>

              <a href="/cart" className="hover:text-white">
                Sepet
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold">Destek ve Kurumsal</h3>

            <div className="mt-4 grid gap-3 text-sm text-gray-400">
              <a href="/support" className="hover:text-white">
                Destek Merkezi
              </a>

              <a href="/about" className="hover:text-white">
                Hakkımızda
              </a>

              <a href="/contact" className="hover:text-white">
                İletişim
              </a>

              <a href="/yasal" className="hover:text-white">
                Yasal Bilgiler
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold">Yasal Sayfalar</h3>

            <div className="mt-4 grid gap-3 text-sm text-gray-400">
              <a href="/gizlilik-politikasi" className="hover:text-white">
                Gizlilik Politikası
              </a>

              <a href="/kullanim-sartlari" className="hover:text-white">
                Kullanım Şartları
              </a>

              <a href="/iade-politikasi" className="hover:text-white">
                İade Politikası
              </a>

              <a href="/satici-kurallari" className="hover:text-white">
                Satıcı Kuralları
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-3 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
            <p>© {year} devcodstore. Tüm hakları saklıdır.</p>

            <p>
              Dijital ürün teslimatı, kullanıcı hesabı ve Dosyalarım bölümü
              üzerinden yapılır.
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
}
