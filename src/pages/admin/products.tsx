const products = [
  {
    id: "PRD-001",
    title: "Modern E-Ticaret Sitesi",
    seller: "NCS Studio",
    category: "Web Site",
    price: "₺1.499",
    status: "Yayında",
  },
  {
    id: "PRD-002",
    title: "Admin Panel Paketi",
    seller: "CodeMarket",
    category: "Dashboard",
    price: "₺899",
    status: "Yayında",
  },
  {
    id: "PRD-003",
    title: "Portfolio Scripti",
    seller: "DevCraft",
    category: "Frontend",
    price: "₺499",
    status: "İnceleniyor",
  },
  {
    id: "PRD-004",
    title: "Mobil Uygulama Arayüzü",
    seller: "AppForge",
    category: "Mobile UI",
    price: "₺699",
    status: "Onay Bekliyor",
  },
];

export default function AdminProductsPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Ürünler</h1>
            <p className="text-sm text-gray-400">
              Platformdaki ürünleri ve durumlarını yönet
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Admin Panele Dön
          </a>
        </nav>

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ürün</p>
            <h2 className="mt-3 text-4xl font-bold">4</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yayında</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">2</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">İnceleniyor</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">1</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Onay Bekliyor</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">1</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Ürün Listesi</h2>

          <div className="mt-6 grid gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-4 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="font-semibold">{product.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Ürün No: {product.id}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Satıcı: {product.seller}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Kategori: {product.category}
                  </p>
                </div>

                <div className="grid gap-3 md:text-right">
                  <p className="text-2xl font-bold">{product.price}</p>

                  <span
                    className={
                      product.status === "Yayında"
                        ? "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300 md:ml-auto"
                        : product.status === "İnceleniyor"
                        ? "w-fit rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300 md:ml-auto"
                        : "w-fit rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300 md:ml-auto"
                    }
                  >
                    {product.status}
                  </span>

                  <a
                    href="/admin/review/1"
                    className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                  >
                    İncele
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
