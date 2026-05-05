import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  status: string;
  description: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "buyer" | "seller" | "admin";
};

type Order = {
  id: string;
  price: string;
  status: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHome() {
      setLoading(true);

      const [productsResult, profilesResult, ordersResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("status", "Yayında")
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("id,email,full_name,account_type"),

        supabase
          .from("orders")
          .select("id,price,status"),
      ]);

      setProducts(productsResult.data || []);
      setProfiles(profilesResult.data || []);
      setOrders(ordersResult.data || []);

      setLoading(false);
    }

    loadHome();
  }, []);

  function parsePrice(price: string) {
    const numberText = price.replace(/[^\d]/g, "");
    return Number(numberText || 0);
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(value);
  }

  const totalProducts = products.length;
  const sellerCount = profiles.filter((profile) => profile.account_type === "seller").length;

  const totalRevenue = orders
    .filter((order) => order.status !== "İade Edildi")
    .reduce((total, order) => total + parsePrice(order.price), 0);

  const featuredProducts = products.slice(0, 3);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070A12] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-10 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="relative grid gap-10 py-16 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300">
              Geliştiriciler için yeni nesil kod pazarı
            </p>

            <h2 className="max-w-2xl text-5xl font-bold leading-tight">
              Hazır projeleri keşfet, satın al veya kendi kodunu sat.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
              devcodstore; web sitesi, uygulama arayüzü, admin panel ve proje
              dosyalarının güvenli şekilde listelenip satılacağı modern bir platformdur.
            </p>

            <div className="mt-8 flex gap-4">
              <a
                href="/products"
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 font-semibold text-white hover:from-blue-500 hover:to-blue-600 shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                🛍️ Ürünleri Keşfet
              </a>

              <a
                href="/seller"
                className="rounded-2xl border border-white/30 bg-gradient-to-r from-white/10 to-white/5 px-8 py-4 font-semibold text-gray-200 hover:bg-white/20 hover:border-white/50 transition-all duration-200 backdrop-blur-sm transform hover:scale-105"
              >
                💼 Satıcı Ol
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-gradient-to-r from-slate-900/80 to-slate-800/80 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                📊
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Canlı Platform Paneli</h3>
                <p className="text-sm text-gray-400">
                  Veriler Supabase&apos;den gerçek zamanlı olarak çekilir
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-gradient-to-r from-black/50 to-slate-900/50 backdrop-blur-sm p-6 text-gray-400 border border-white/10">
                <div className="animate-pulse flex items-center gap-3">
                  <div className="h-8 w-8 bg-gray-600 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                    <div className="h-3 bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 to-blue-600/5 backdrop-blur-sm p-5 border border-blue-500/20">
                  <p className="text-sm text-blue-300 font-medium">Yayındaki Ürün</p>
                  <p className="mt-2 text-3xl font-bold text-blue-400">{totalProducts}</p>
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-green-500/10 to-green-600/5 backdrop-blur-sm p-5 border border-green-500/20">
                  <p className="text-sm text-green-300 font-medium">Satıcı Sayısı</p>
                  <p className="mt-2 text-3xl font-bold text-green-400">{sellerCount}</p>
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-purple-600/5 backdrop-blur-sm p-5 border border-purple-500/20">
                  <p className="text-sm text-purple-300 font-medium">Toplam Ciro</p>
                  <p className="mt-2 text-3xl font-bold text-purple-400">
                    {formatMoney(totalRevenue)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mb-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="group relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-xl font-bold shadow-lg">
                ✓
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Admin Onaylı Ürünler</h3>
              <p className="text-sm leading-6 text-gray-400">
                Yayına çıkan ürünler admin kontrolünden geçer. Kullanıcı sadece onaylı ürünleri görür.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-green-600 to-green-700 text-xl font-bold shadow-lg">
                ↓
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Dijital Teslimat</h3>
              <p className="text-sm leading-6 text-gray-400">
                Satın alınan projeler kullanıcının Dosyalarım alanına tanımlanır ve güvenli indirme sağlanır.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 text-xl font-bold shadow-lg">
                S
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Satıcı Paneli</h3>
              <p className="text-sm leading-6 text-gray-400">
                Satıcılar ürünlerini, ZIP dosyalarını, görsellerini, satışlarını ve kazançlarını takip edebilir.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-600 to-yellow-700 text-xl font-bold shadow-lg">
                ★
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Yorum ve Puanlama</h3>
              <p className="text-sm leading-6 text-gray-400">
                Satın alan kullanıcılar ürünlere yorum ve puan verebilir. Böylece ürün kalitesi görünür olur.
              </p>
            </div>
          </div>
        </section>

        <section className="relative">
          <div className="text-center">
            <h3 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Öne Çıkan Ürünler
            </h3>
            <p className="mt-3 text-gray-400 text-lg">
              Veritabanındaki yayındaki ürünlerden seçilen kod paketleri
            </p>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="group relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-blue-500/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <span className="rounded-full bg-gradient-to-r from-blue-500/20 to-blue-600/20 px-4 py-2 text-sm font-medium text-blue-300 border border-blue-500/30">
                    {product.category}
                  </span>

                  <h4 className="mt-6 text-xl font-bold text-white group-hover:text-blue-300 transition-colors duration-200">
                    {product.title}
                  </h4>

                  <p className="mt-4 text-sm leading-7 text-gray-400 line-clamp-3">
                    {product.description || "Bu ürün için açıklama eklenmemiş."}
                  </p>

                  <div className="mt-5 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-xs font-bold text-white">
                      {product.seller.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-gray-400">
                      <span className="font-medium text-gray-300">Satıcı:</span> {product.seller}
                    </p>
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{product.price}</p>
                      <p className="text-xs text-gray-400 mt-1">₺</p>
                    </div>

                    <a
                      href={`/product/${product.id}`}
                      className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-500 hover:to-blue-600 transition-all duration-200 transform hover:scale-105"
                    >
                      👁️ İncele
                    </a>
                  </div>
                </div>
              </div>
            ))}

            {!loading && featuredProducts.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-400 md:col-span-3">
                Henüz yayında ürün yok.
              </div>
            )}
          </div>
        </section>

        <section className="mt-20 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8">
          <div className="mb-8">
            <h3 className="text-3xl font-bold">devcodstore Nasıl Çalışır?</h3>
            <p className="mt-2 text-gray-400">
              Alıcılar hazır projeleri satın alır, satıcılar kendi kod paketlerini
              güvenli şekilde yayınlar.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-blue-400/20 bg-black/30 p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold">
                1
              </div>
              <h4 className="text-xl font-bold">Projeyi Keşfet</h4>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Kullanıcılar web sitesi, admin panel, mobil arayüz ve hazır kod
                paketlerini inceler.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-400/20 bg-black/30 p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold">
                2
              </div>
              <h4 className="text-xl font-bold">Güvenli Satın Al</h4>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Satın alma sonrası proje dosyası kullanıcının hesabına tanımlanır.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-400/20 bg-black/30 p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold">
                3
              </div>
              <h4 className="text-xl font-bold">Dosyalarını İndir</h4>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Kullanıcı, aldığı projeye Dosyalarım ekranından erişir ve indirebilir.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 mb-8 rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-600/15 via-indigo-500/10 to-fuchsia-500/10 px-8 py-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-200">
                Topluluğa Katıl
              </p>
              <h3 className="mt-3 text-3xl font-bold">
                Projelerini satışa çıkar, gelir elde etmeye başla.
              </h3>
              <p className="mt-3 max-w-2xl text-gray-300">
                Başvurunu tamamla, ürünlerini yükle ve admin onayı sonrası binlerce geliştiriciye ulaş.
              </p>
            </div>
            <a
              href="/seller/apply"
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 px-7 py-4 font-semibold text-white shadow-lg transition hover:scale-105 hover:from-blue-400 hover:to-indigo-500"
            >
              Satıcı Başvurusu Yap
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
