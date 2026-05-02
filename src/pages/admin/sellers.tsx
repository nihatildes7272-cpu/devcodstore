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

        <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-transparent p-8 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Satıcılar</h1>
              <p className="mt-3 text-gray-300">
                Platformdaki aktif satıcıları ve kazançlarını görüntüle.
              </p>
            </div>
            <button className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:scale-105 active:scale-95">
              Yenile
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {[
            { label: "Toplam Satıcı", value: 3, color: "text-white" },
            { label: "Aktif Satıcı", value: 2, color: "text-green-400" },
            { label: "Onay Bekleyen", value: 1, color: "text-yellow-400" },
          ].map((stat, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
              <h2 className={`mt-3 text-4xl font-black ${stat.color}`}>
                {stat.value}
              </h2>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <h2 className="text-2xl font-black tracking-tight">Satıcı Listesi</h2>

          <div className="mt-8 grid gap-4">
            {sellers.map((seller) => (
              <div
                key={seller.id}
                className="group flex flex-col gap-4 rounded-3xl border border-white/5 bg-white/5 p-6 transition hover:bg-white/[0.08] md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="text-xl font-black group-hover:text-blue-300 transition-colors">{seller.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Satıcı No: {seller.id}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    E-posta: {seller.email}
                  </p>
                </div>

                <div className="grid gap-2 md:text-right">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Ürün sayısı: {seller.products}
                  </p>
                  <p className="text-2xl font-black text-white">{seller.revenue}</p>

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
