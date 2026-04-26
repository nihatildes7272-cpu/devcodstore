const purchasedProducts = [
  {
    title: "Modern E-Ticaret Sitesi",
    date: "26 Nisan 2026",
    status: "Aktif",
  },
  {
    title: "Admin Panel Paketi",
    date: "25 Nisan 2026",
    status: "Aktif",
  },
];

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore Hesabım</h1>
            <p className="text-sm text-gray-400">
              Profil, satın almalar ve dosya erişimi
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/products"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Ürünler
            </a>

            <a
              href="/library"
              className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Dosyalarım
            </a>
          </div>
        </nav>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kullanıcı</p>
            <h2 className="mt-3 text-2xl font-bold">Nihat İldeş</h2>
            <p className="mt-2 text-sm text-gray-400">Alıcı hesabı</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Satın Alınan Ürün</p>
            <h2 className="mt-3 text-4xl font-bold">2</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Hesap Durumu</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">Aktif</h2>
          </div>
        </section>

        <section className="mt-10 grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Satın Alma Geçmişi</h2>

            <div className="mt-6 grid gap-4">
              {purchasedProducts.map((product) => (
                <div
                  key={product.title}
                  className="flex flex-col gap-4 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-semibold">{product.title}</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Satın alma tarihi: {product.date}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300">
                    {product.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Hızlı İşlemler</h2>

            <div className="mt-6 grid gap-3">
              <a
                href="/library"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-semibold hover:bg-blue-500"
              >
                Dosyalarımı Aç
              </a>

              <a
                href="/products"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold hover:bg-white/10"
              >
                Yeni Ürün Keşfet
              </a>

              <a
                href="/seller"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold hover:bg-white/10"
              >
                Satıcı Paneline Git
              </a>

              <a
                href="/"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold hover:bg-white/10"
              >
                Ana Sayfa
              </a>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
