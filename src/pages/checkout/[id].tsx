import { useRouter } from "next/router";

const products = [
  {
    id: "1",
    title: "Modern E-Ticaret Sitesi",
    price: "₺1.499",
    seller: "NCS Studio",
  },
  {
    id: "2",
    title: "Admin Panel Paketi",
    price: "₺899",
    seller: "CodeMarket",
  },
  {
    id: "3",
    title: "Portfolio Scripti",
    price: "₺499",
    seller: "DevCraft",
  },
  {
    id: "4",
    title: "Mobil Uygulama Arayüzü",
    price: "₺699",
    seller: "AppForge",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { id } = router.query;

  const product = products.find((item) => item.id === id);

  if (!router.isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Yükleniyor...
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Ürün bulunamadı</h1>
          <a href="/products" className="mt-6 inline-block rounded-2xl bg-white px-5 py-3 text-black">
            Ürünlere dön
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore</h1>
            <p className="text-sm text-gray-400">Satın alma ekranı</p>
          </div>

          <a
            href={`/product/${product.id}`}
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Ürüne Dön
          </a>
        </nav>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-3xl font-bold">Sipariş Özeti</h2>

            <div className="mt-6 rounded-2xl bg-black/30 p-5">
              <p className="text-sm text-gray-400">Ürün</p>
              <h3 className="mt-2 text-2xl font-bold">{product.title}</h3>
              <p className="mt-2 text-sm text-gray-400">Satıcı: {product.seller}</p>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-black/30 p-5">
              <span className="text-gray-400">Toplam Tutar</span>
              <span className="text-3xl font-bold">{product.price}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-3xl font-bold">Ödeme Bilgileri</h2>
            <p className="mt-2 text-sm text-gray-400">
              Şimdilik tasarım ekranı. İleride buraya gerçek ödeme sistemi eklenecek.
            </p>

            <div className="mt-6 grid gap-4">
              <input
                placeholder="Kart üzerindeki isim"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <input
                placeholder="Kart numarası"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="AA/YY"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />

                <input
                  placeholder="CVV"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />
              </div>

              <a
                href={`/success/${product.id}`}
                className="mt-2 rounded-2xl bg-blue-600 px-5 py-4 text-center font-semibold hover:bg-blue-500"
              >
                Ödemeyi Tamamla
              </a>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
