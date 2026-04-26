const monthlyReports = [
  {
    month: "Ocak",
    revenue: "₺4.200",
    orders: 6,
    sellers: 2,
  },
  {
    month: "Şubat",
    revenue: "₺7.850",
    orders: 11,
    sellers: 4,
  },
  {
    month: "Mart",
    revenue: "₺12.300",
    orders: 18,
    sellers: 7,
  },
  {
    month: "Nisan",
    revenue: "₺18.500",
    orders: 27,
    sellers: 10,
  },
];

export default function AdminReportsPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Raporlar</h1>
            <p className="text-sm text-gray-400">
              devcodstore gelir, sipariş ve satıcı analizleri
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
            <p className="text-sm text-gray-400">Toplam Ciro</p>
            <h2 className="mt-3 text-4xl font-bold">₺42.850</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Sipariş</p>
            <h2 className="mt-3 text-4xl font-bold">62</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Aktif Satıcı</p>
            <h2 className="mt-3 text-4xl font-bold">24</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Platform Kazancı</p>
            <h2 className="mt-3 text-4xl font-bold">₺6.420</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Aylık Performans</h2>
          <p className="mt-2 text-sm text-gray-400">
            Şimdilik örnek veriler. İleride bu alan veritabanından gerçek satış verilerini gösterecek.
          </p>

          <div className="mt-6 grid gap-4">
            {monthlyReports.map((report) => (
              <div
                key={report.month}
                className="grid gap-4 rounded-2xl bg-black/30 p-5 md:grid-cols-4 md:items-center"
              >
                <div>
                  <p className="text-sm text-gray-400">Ay</p>
                  <h3 className="mt-1 text-xl font-bold">{report.month}</h3>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Ciro</p>
                  <h3 className="mt-1 text-xl font-bold">{report.revenue}</h3>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Sipariş</p>
                  <h3 className="mt-1 text-xl font-bold">{report.orders}</h3>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Yeni Satıcı</p>
                  <h3 className="mt-1 text-xl font-bold">{report.sellers}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">En Çok Satan Kategoriler</h2>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span>Web Site</span>
                  <span className="font-bold">34 satış</span>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span>Dashboard</span>
                  <span className="font-bold">18 satış</span>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span>Frontend</span>
                  <span className="font-bold">10 satış</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Platform Notları</h2>

            <div className="mt-6 rounded-2xl bg-black/30 p-5">
              <p className="leading-7 text-gray-300">
                devcodstore büyüdükçe burada günlük satış, haftalık gelir,
                satıcı performansı ve en çok indirilen ürünler gibi gerçek analizler yer alacak.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
