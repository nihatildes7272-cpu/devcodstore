import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import MainNavbar from "@/components/MainNavbar";

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
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHome() {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);

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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
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
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <MainNavbar user={user} />

        <section className="grid gap-10 py-16 md:grid-cols-2 md:items-center">
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
                className="rounded-2xl bg-blue-600 px-7 py-3 font-semibold hover:bg-blue-500"
              >
                Ürünleri Keşfet
              </a>

              <a
                href="/seller"
                className="rounded-2xl border border-white/15 px-7 py-3 font-semibold hover:bg-white/10"
              >
                Satıcı Ol
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <h3 className="text-xl font-semibold">Canlı Platform Paneli</h3>
            <p className="mt-1 text-sm text-gray-400">
              Veriler Supabase’den gerçek zamanlı olarak çekilir.
            </p>

            {loading ? (
              <div className="mt-5 rounded-2xl bg-black/30 p-5 text-gray-400">
                Veriler yükleniyor...
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Yayındaki Ürün</p>
                  <p className="mt-2 text-3xl font-bold">{totalProducts}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Satıcı Sayısı</p>
                  <p className="mt-2 text-3xl font-bold">{sellerCount}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Toplam Ciro</p>
                  <p className="mt-2 text-3xl font-bold">
                    {formatMoney(totalRevenue)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-3xl font-bold">Öne Çıkan Ürünler</h3>
          <p className="mt-2 text-gray-400">
            Veritabanındaki yayındaki ürünlerden seçilen kod paketleri.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                  {product.category}
                </span>

                <h4 className="mt-5 text-xl font-semibold">{product.title}</h4>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {product.description || "Bu ürün için açıklama eklenmemiş."}
                </p>

                <p className="mt-3 text-sm text-gray-500">
                  Satıcı: {product.seller}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-2xl font-bold">{product.price}</p>

                  <a
                    href={`/product/${product.id}`}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                  >
                    İncele
                  </a>
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

        <section className="mt-20 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-8">
            <h3 className="text-3xl font-bold">devcodstore Nasıl Çalışır?</h3>
            <p className="mt-2 text-gray-400">
              Alıcılar hazır projeleri satın alır, satıcılar kendi kod paketlerini
              güvenli şekilde yayınlar.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl bg-black/30 p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold">
                1
              </div>
              <h4 className="text-xl font-bold">Projeyi Keşfet</h4>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Kullanıcılar web sitesi, admin panel, mobil arayüz ve hazır kod
                paketlerini inceler.
              </p>
            </div>

            <div className="rounded-3xl bg-black/30 p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold">
                2
              </div>
              <h4 className="text-xl font-bold">Güvenli Satın Al</h4>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Satın alma sonrası proje dosyası kullanıcının hesabına tanımlanır.
              </p>
            </div>

            <div className="rounded-3xl bg-black/30 p-6">
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
      </section>
    </main>
  );
}
