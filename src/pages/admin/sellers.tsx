import AdminNavbar from "@/components/AdminNavbar";
const sellers = [
  {
    id: "SELL-001",
    name: "NCS Studio",
    email: "ncsstudio@example.com",
    products: 7,
    revenue: "₺8.450",
    status: "Aktif",
  },
  {
    id: "SELL-002",
    name: "CodeMarket",
    email: "codemarket@example.com",
    products: 4,
    revenue: "₺5.200",
    status: "Aktif",
  },
  {
    id: "SELL-003",
    name: "DevCraft",
    email: "devcraft@example.com",
    products: 2,
    revenue: "₺1.750",
    status: "Onay Bekliyor",
  },
];

export default function AdminSellersPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Satıcı</p>
            <h2 className="mt-3 text-4xl font-bold">3</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Aktif Satıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">2</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Onay Bekleyen</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">1</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Satıcı Listesi</h2>

          <div className="mt-6 grid gap-4">
            {sellers.map((seller) => (
              <div
                key={seller.id}
                className="flex flex-col gap-4 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="font-semibold">{seller.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Satıcı No: {seller.id}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    E-posta: {seller.email}
                  </p>
                </div>

                <div className="grid gap-2 md:text-right">
                  <p className="text-sm text-gray-400">
                    Ürün sayısı: {seller.products}
                  </p>
                  <p className="text-lg font-bold">{seller.revenue}</p>

                  <span
                    className={
                      seller.status === "Aktif"
                        ? "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300 md:ml-auto"
                        : "w-fit rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300 md:ml-auto"
                    }
                  >
                    {seller.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
