import { useRouter } from "next/router";

const products = [
  {
    id: "1",
    title: "Modern E-Ticaret Sitesi",
    price: "₺1.499",
  },
  {
    id: "2",
    title: "Admin Panel Paketi",
    price: "₺899",
  },
  {
    id: "3",
    title: "Portfolio Scripti",
    price: "₺499",
  },
  {
    id: "4",
    title: "Mobil Uygulama Arayüzü",
    price: "₺699",
  },
];

export default function SuccessPage() {
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
          <h1 className="text-3xl font-bold">Sipariş bulunamadı</h1>
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
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-4xl text-green-300">
          ✓
        </div>

        <h1 className="mt-6 text-4xl font-bold">Ödeme Başarılı</h1>

        <p className="mt-4 text-gray-400">
          Satın alma işlemin başarıyla tamamlandı. Proje dosyası hesabına tanımlandı.
        </p>

        <div className="mt-8 rounded-2xl bg-black/30 p-5 text-left">
          <p className="text-sm text-gray-400">Satın Alınan Ürün</p>
          <h2 className="mt-2 text-2xl font-bold">{product.title}</h2>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-gray-400">Ödenen Tutar</span>
            <span className="text-2xl font-bold">{product.price}</span>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a
            href="/library"
            className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
          >
            Dosyalarım
          </a>

          <a
            href="/products"
            className="rounded-2xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/10"
          >
            Alışverişe Devam Et
          </a>
        </div>
      </section>
    </main>
  );
}
