export default function SellerPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore Satıcı Paneli</h1>
            <p className="text-sm text-gray-400">Projelerini yükle, satışlarını takip et</p>
          </div>

          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Ana Sayfa
            </a>

            <a
              href="/products"
              className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Ürünler
            </a>
          </div>
        </nav>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yüklenen Proje</p>
            <h2 className="mt-3 text-4xl font-bold">7</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Satış</p>
            <h2 className="mt-3 text-4xl font-bold">32</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kazanç</p>
            <h2 className="mt-3 text-4xl font-bold">₺8.450</h2>
          </div>
        </section>

        <section className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Yeni Proje Yükle</h2>
            <p className="mt-2 text-sm text-gray-400">
              Satıcılar burada proje başlığı, kategori, fiyat ve dosya bilgilerini girecek.
            </p>

            <div className="mt-6 grid gap-4">
              <input
                placeholder="Proje adı"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <input
                placeholder="Kategori"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <input
                placeholder="Fiyat"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <textarea
                placeholder="Proje açıklaması"
                className="min-h-32 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <a
                href="/seller/success"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-semibold hover:bg-blue-500"
              >
                Projeyi Gönder
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Projelerim</h2>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Modern E-Ticaret Sitesi</h3>
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300">
                    Yayında
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-400">Fiyat: ₺1.499</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Portfolio Scripti</h3>
                  <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-300">
                    Onay Bekliyor
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-400">Fiyat: ₺499</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Admin Panel Paketi</h3>
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                    İnceleniyor
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-400">Fiyat: ₺899</p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
