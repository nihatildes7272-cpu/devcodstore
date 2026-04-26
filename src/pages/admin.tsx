export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore Admin</h1>
            <p className="text-sm text-gray-400">Platform yönetim paneli</p>
          </div>

          <div className="flex gap-3">
            <a
              href="/admin/products"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Ürünler
            </a>

            <a
              href="/admin/reports"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Raporlar
            </a>

            <a
              href="/admin/orders"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Siparişler
            </a>

            <a
              href="/admin/sellers"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Satıcılar
            </a>

            <a
              href="/admin/users"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Kullanıcılar
            </a>

            <a
              href="/"
              className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Ana Sayfa
            </a>
          </div>
        </nav>

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ürün</p>
            <h2 className="mt-3 text-4xl font-bold">128</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Satıcı</p>
            <h2 className="mt-3 text-4xl font-bold">24</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Bekleyen Onay</p>
            <h2 className="mt-3 text-4xl font-bold">16</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Kazanç</p>
            <h2 className="mt-3 text-4xl font-bold">₺42.850</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Onay Bekleyen Projeler</h2>

          <div className="mt-6 grid gap-4">
            <div className="flex flex-col gap-4 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">Modern E-Ticaret Sitesi</h3>
                <p className="text-sm text-gray-400">Satıcı: NCS Studio</p>
              </div>

              <div className="flex gap-3">
                <span className="rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300">
                  Onay Bekliyor
                </span>

                <a
                  href="/admin/review/1"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                >
                  İncele
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">Portfolio Scripti</h3>
                <p className="text-sm text-gray-400">Satıcı: DevCraft</p>
              </div>

              <div className="flex gap-3">
                <span className="rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300">
                  İnceleniyor
                </span>

                <a
                  href="/admin/review/2"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                >
                  İncele
                </a>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
