const purchasedProducts = [
  {
    id: "1",
    title: "Modern E-Ticaret Sitesi",
    seller: "NCS Studio",
    date: "26 Nisan 2026",
    type: "Web Site",
  },
  {
    id: "2",
    title: "Admin Panel Paketi",
    seller: "CodeMarket",
    date: "25 Nisan 2026",
    type: "Dashboard",
  },
];

export default function LibraryPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dosyalarım</h1>
            <p className="text-sm text-gray-400">
              Satın aldığın proje ve kod paketleri
            </p>
          </div>

          <a
            href="/products"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Ürünlere Git
          </a>
        </nav>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-3xl font-bold">Satın Alınanlar</h2>
          <p className="mt-2 text-gray-400">
            İleride gerçek satın alma kayıtları burada veritabanından gelecek.
          </p>

          <div className="mt-8 grid gap-5">
            {purchasedProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/30 p-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                    {product.type}
                  </span>

                  <h3 className="mt-4 text-2xl font-bold">{product.title}</h3>
                  <p className="mt-2 text-sm text-gray-400">
                    Satıcı: {product.seller}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Satın alma tarihi: {product.date}
                  </p>
                </div>

                <a
                  href={`/download/${product.id}`}
                  className="rounded-2xl bg-blue-600 px-6 py-3 text-center font-semibold hover:bg-blue-500"
                >
                  Dosyayı İndir
                </a>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
