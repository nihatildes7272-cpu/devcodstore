import { useRouter } from "next/router";

const products = [
  {
    id: "1",
    title: "Modern E-Ticaret Sitesi",
    category: "Web Site",
    price: "₺1.499",
    seller: "NCS Studio",
    description:
      "Hazır yönetim paneli, ürün listeleme, sepet yapısı ve modern arayüz içeren e-ticaret web sitesi paketidir.",
    includes: ["Ana sayfa", "Ürün sayfası", "Sepet tasarımı", "Admin panel arayüzü"],
  },
  {
    id: "2",
    title: "Admin Panel Paketi",
    category: "Dashboard",
    price: "₺899",
    seller: "CodeMarket",
    description:
      "Satış, kullanıcı, ürün ve rapor yönetimi için hazırlanmış sade ve modern admin panel tasarımıdır.",
    includes: ["Dashboard", "Kullanıcı listesi", "Ürün yönetimi", "Rapor kartları"],
  },
  {
    id: "3",
    title: "Portfolio Scripti",
    category: "Frontend",
    price: "₺499",
    seller: "DevCraft",
    description:
      "Yazılımcılar, tasarımcılar ve freelancerlar için hazırlanmış şık kişisel portfolio sistemidir.",
    includes: ["Hakkımda alanı", "Projeler bölümü", "İletişim alanı", "Responsive tasarım"],
  },
  {
    id: "4",
    title: "Mobil Uygulama Arayüzü",
    category: "Mobile UI",
    price: "₺699",
    seller: "AppForge",
    description:
      "Mobil uygulama projeleri için modern, sade ve profesyonel arayüz ekranları paketidir.",
    includes: ["Giriş ekranı", "Ana ekran", "Profil ekranı", "Ayarlar ekranı"],
  },
];

export default function ProductDetailPage() {
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
      <section className="mx-auto max-w-6xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore</h1>
            <p className="text-sm text-gray-400">Ürün detay sayfası</p>
          </div>

          <a
            href="/products"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Ürünlere Dön
          </a>
        </nav>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <span className="rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300">
              {product.category}
            </span>

            <h2 className="mt-6 text-4xl font-bold">{product.title}</h2>

            <p className="mt-4 text-sm text-gray-400">Satıcı: {product.seller}</p>

            <p className="mt-6 text-lg leading-8 text-gray-300">
              {product.description}
            </p>

            <div className="mt-8">
              <p className="text-sm text-gray-400">Fiyat</p>
              <p className="text-4xl font-bold">{product.price}</p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a
                href={`/cart/${product.id}`}
                className="block rounded-2xl bg-blue-600 px-6 py-4 text-center font-semibold hover:bg-blue-500"
              >
                Sepete Ekle
              </a>

              <a
                href={`/checkout/${product.id}`}
                className="block rounded-2xl border border-white/15 px-6 py-4 text-center font-semibold hover:bg-white/10"
              >
                Hemen Satın Al
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-bold">Paket İçeriği</h3>

            <div className="mt-6 grid gap-4">
              {product.includes.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-black/30 p-5">
              <h4 className="font-semibold">Teslimat Bilgisi</h4>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Satın alma tamamlandıktan sonra proje dosyaları kullanıcının hesabına
                tanımlanacak. İleride buraya gerçek dosya indirme sistemi ekleyeceğiz.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
