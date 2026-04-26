import { useRouter } from "next/router";

const products = [
  {
    id: "1",
    title: "Modern E-Ticaret Sitesi",
    category: "Web Site",
    price: "₺1.499",
    seller: "NCS Studio",
  },
  {
    id: "2",
    title: "Admin Panel Paketi",
    category: "Dashboard",
    price: "₺899",
    seller: "CodeMarket",
  },
  {
    id: "3",
    title: "Portfolio Scripti",
    category: "Frontend",
    price: "₺499",
    seller: "DevCraft",
  },
  {
    id: "4",
    title: "Mobil Uygulama Arayüzü",
    category: "Mobile UI",
    price: "₺699",
    seller: "AppForge",
  },
];

export default function CartPage() {
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
          <h1 className="text-3xl font-bold">Sepette ürün bulunamadı</h1>
          <a
            href="/products"
            className="mt-6 inline-block rounded-2xl bg-white px-5 py-3 text-black"
          >
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
            <h1 className="text-2xl font-bold">devcodstore Sepet</h1>
            <p className="text-sm text-gray-400">Satın almadan önce siparişini kontrol et</p>
          </div>

          <a
            href="/products"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Ürünlere Dön
          </a>
        </nav>

        <section className="grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-3xl font-bold">Sepetindeki Ürün</h2>

            <div className="mt-6 rounded-3xl bg-black/30 p-6">
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                {product.category}
              </span>

              <h3 className="mt-5 text-2xl font-bold">{product.title}</h3>
              <p className="mt-2 text-sm text-gray-400">Satıcı: {product.seller}</p>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                <span className="text-gray-400">Fiyat</span>
                <span className="text-2xl font-bold">{product.price}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Sipariş Özeti</h2>

            <div className="mt-6 grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Ara toplam</span>
                <span className="font-semibold">{product.price}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Platform hizmet bedeli</span>
                <span className="font-semibold">₺0</span>
              </div>

              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="text-gray-400">Toplam</span>
                <span className="text-3xl font-bold">{product.price}</span>
              </div>
            </div>

            <a
              href={`/checkout/${product.id}`}
              className="mt-8 block rounded-2xl bg-blue-600 px-5 py-4 text-center font-semibold hover:bg-blue-500"
            >
              Satın Almaya Geç
            </a>

            <a
              href={`/product/${product.id}`}
              className="mt-4 block text-center text-sm text-gray-400 hover:text-white"
            >
              Ürün detayına dön
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
