const orders = [
  {
    id: "ORD-1001",
    customer: "Nihat İldeş",
    product: "Modern E-Ticaret Sitesi",
    price: "₺1.499",
    date: "26 Nisan 2026",
    status: "Tamamlandı",
  },
  {
    id: "ORD-1002",
    customer: "Ahmet Yılmaz",
    product: "Admin Panel Paketi",
    price: "₺899",
    date: "25 Nisan 2026",
    status: "Tamamlandı",
  },
  {
    id: "ORD-1003",
    customer: "Mehmet Kaya",
    product: "Portfolio Scripti",
    price: "₺499",
    date: "24 Nisan 2026",
    status: "Beklemede",
  },
];

export default function AdminOrdersPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Siparişler</h1>
            <p className="text-sm text-gray-400">
              devcodstore satış ve sipariş takibi
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Admin Panele Dön
          </a>
        </nav>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Sipariş</p>
            <h2 className="mt-3 text-4xl font-bold">3</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ciro</p>
            <h2 className="mt-3 text-4xl font-bold">₺2.897</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Bekleyen Sipariş</p>
            <h2 className="mt-3 text-4xl font-bold">1</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Son Siparişler</h2>

          <div className="mt-6 grid gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-4 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="font-semibold">{order.product}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Sipariş No: {order.id}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Müşteri: {order.customer}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Tarih: {order.date}
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:items-end">
                  <p className="text-2xl font-bold">{order.price}</p>

                  <span
                    className={
                      order.status === "Tamamlandı"
                        ? "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300"
                        : "w-fit rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300"
                    }
                  >
                    {order.status}
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
