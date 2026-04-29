import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type Product = {
  id: string;
  title: string;
  seller: string;
  category: string;
  price: string;
  status: string;
  description: string | null;
  created_at?: string;
};

type Order = {
  id: string;
  user_id: string | null;
  product_id: string | null;
  product_title: string;
  price: string;
  seller: string;
  status: string;
  created_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "buyer" | "seller" | "admin";
  created_at: string | null;
};

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 15000,
  message = "Sunucu yanıtı gecikti."
): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadAdminDashboard(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const [productsResult, ordersResult, profilesResult] = await Promise.all([
        withTimeout(
          supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false }),
          15000,
          "Ürünler yüklenirken sunucu geç cevap verdi."
        ),
        withTimeout(
          supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false }),
          15000,
          "Siparişler yüklenirken sunucu geç cevap verdi."
        ),
        withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false }),
          15000,
          "Kullanıcılar yüklenirken sunucu geç cevap verdi."
        ),
      ]);

      if (productsResult.error) {
        setMessage("Ürünler yüklenemedi: " + productsResult.error.message);
      } else {
        setProducts(productsResult.data || []);
      }

      if (ordersResult.error) {
        setMessage("Siparişler yüklenemedi: " + ordersResult.error.message);
      } else {
        setOrders(ordersResult.data || []);
      }

      if (profilesResult.error) {
        setMessage("Kullanıcılar yüklenemedi: " + profilesResult.error.message);
      } else {
        setProfiles(profilesResult.data || []);
      }

      setLastUpdated(
        new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Admin paneli yüklenirken bilinmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAdminDashboard();

    const productChannel = supabase
      .channel("admin-dashboard-products")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => loadAdminDashboard(false)
      )
      .subscribe();

    const orderChannel = supabase
      .channel("admin-dashboard-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => loadAdminDashboard(false)
      )
      .subscribe();

    const profileChannel = supabase
      .channel("admin-dashboard-profiles")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => loadAdminDashboard(false)
      )
      .subscribe();

    const interval = setInterval(() => {
      loadAdminDashboard(false);
    }, 20000);

    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(profileChannel);
      clearInterval(interval);
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

  function formatDate(date: string | null | undefined) {
    if (!date) return "Tarih yok";

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function statusClass(status: string) {
    if (status === "Yayında" || status === "Tamamlandı") {
      return "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "Reddedildi" || status === "İade Edildi") {
      return "w-fit rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    if (status === "Yayından Kaldırıldı") {
      return "w-fit rounded-full bg-gray-500/20 px-4 py-2 text-sm text-gray-300";
    }

    return "w-fit rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
  }

  async function updateProductStatus(productId: string, status: string) {
    setMessage("");

    const { error } = await supabase
      .from("products")
      .update({ status })
      .eq("id", productId);

    if (error) {
      setMessage("Ürün durumu güncellenemedi: " + error.message);
      return;
    }

    await loadAdminDashboard(false);
  }

  const totalRevenue = orders
    .filter((order) => order.status !== "İade Edildi")
    .reduce((total, order) => total + parsePrice(order.price), 0);

  const liveProducts = products.filter((product) => product.status === "Yayında").length;
  const pendingProducts = products.filter((product) => product.status === "Onay Bekliyor");
  const rejectedProducts = products.filter((product) => product.status === "Reddedildi").length;
  const sellers = profiles.filter((profile) => profile.account_type === "seller").length;
  const buyers = profiles.filter((profile) => profile.account_type === "buyer").length;
  const admins = profiles.filter((profile) => profile.account_type === "admin").length;

  const recentOrders = orders.slice(0, 5);
  const recentProducts = products.slice(0, 5);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold">Admin paneli yükleniyor...</h1>
          <p className="mt-3 text-sm text-gray-400">
            Ürünler, siparişler ve kullanıcılar hazırlanıyor.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Admin Paneli</h1>
              <p className="mt-3 text-gray-400">
                devcodstore platformunun ürün, sipariş, kullanıcı ve rapor yönetimi.
              </p>
            </div>

            <div className="rounded-2xl bg-black/30 px-5 py-3 text-sm text-gray-300">
              {refreshing ? (
                <span className="text-blue-300">Canlı yenileniyor...</span>
              ) : lastUpdated ? (
                <span>Son güncelleme: {lastUpdated}</span>
              ) : (
                <span>Canlı takip aktif</span>
              )}
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{message}</p>

            <button
              onClick={() => loadAdminDashboard(false)}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ciro</p>
            <h2 className="mt-3 text-4xl font-bold">{formatMoney(totalRevenue)}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Sipariş</p>
            <h2 className="mt-3 text-4xl font-bold">{orders.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yayındaki Ürün</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{liveProducts}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Onay Bekleyen</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">
              {pendingProducts.length}
            </h2>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ürün</p>
            <h2 className="mt-3 text-4xl font-bold">{products.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kullanıcı</p>
            <h2 className="mt-3 text-4xl font-bold">{profiles.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Satıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">{sellers}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Admin</p>
            <h2 className="mt-3 text-4xl font-bold text-purple-300">{admins}</h2>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-6">
          <a
            href="/admin/products"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/40 hover:bg-white/10 md:col-span-2"
          >
            <h2 className="text-2xl font-bold">Ürün Yönetimi</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Ürünleri onayla, reddet, beklemeye al veya yayından kaldır.
            </p>
          </a>

          <a
            href="/admin/orders"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/40 hover:bg-white/10 md:col-span-2"
          >
            <h2 className="text-2xl font-bold">Siparişler</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Gerçek siparişleri, ciroyu ve sipariş durumlarını yönet.
            </p>
          </a>

          <a
            href="/admin/users"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/40 hover:bg-white/10 md:col-span-2"
          >
            <h2 className="text-2xl font-bold">Kullanıcılar</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Kullanıcıları ve rollerini buyer / seller / admin olarak yönet.
            </p>
          </a>

          <a
            href="/admin/reports"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/40 hover:bg-white/10 md:col-span-3"
          >
            <h2 className="text-2xl font-bold">Raporlar</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Ürün, sipariş, kullanıcı, ciro ve kategori raporlarını incele.
            </p>
          </a>

          <a
            href="/admin/sellers"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/40 hover:bg-white/10 md:col-span-3"
          >
            <h2 className="text-2xl font-bold">Satıcılar</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Satıcı hesaplarını ve platformdaki satıcı durumunu takip et.
            </p>
          </a>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Onay Bekleyen Ürünler</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Satıcıların gönderdiği son ürünler.
                </p>
              </div>

              <a href="/admin/products" className="text-sm text-gray-400 hover:text-white">
                Tümünü gör
              </a>
            </div>

            <div className="mt-6 grid gap-4">
              {pendingProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="rounded-2xl bg-black/30 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold">{product.title}</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Satıcı: {product.seller}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Kategori: {product.category} • {product.price}
                      </p>
                    </div>

                    <span className={statusClass(product.status)}>
                      {product.status}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => updateProductStatus(product.id, "Yayında")}
                      className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-500"
                    >
                      Onayla
                    </button>

                    <button
                      onClick={() => updateProductStatus(product.id, "Reddedildi")}
                      className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
                    >
                      Reddet
                    </button>

                    <a
                      href={`/product/${product.id}`}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
                    >
                      Detay Aç
                    </a>
                  </div>
                </div>
              ))}

              {pendingProducts.length === 0 && (
                <div className="rounded-2xl bg-black/30 p-6 text-center text-gray-400">
                  Onay bekleyen ürün yok.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Son Siparişler</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Platformda oluşan son sipariş kayıtları.
                </p>
              </div>

              <a href="/admin/orders" className="text-sm text-gray-400 hover:text-white">
                Tümünü gör
              </a>
            </div>

            <div className="mt-6 grid gap-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl bg-black/30 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold">{order.product_title}</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Satıcı: {order.seller}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Tarih: {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="grid gap-2 md:text-right">
                      <p className="text-xl font-bold">{order.price}</p>
                      <span className={statusClass(order.status)}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {recentOrders.length === 0 && (
                <div className="rounded-2xl bg-black/30 p-6 text-center text-gray-400">
                  Henüz sipariş yok.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Son Eklenen Ürünler</h2>
              <p className="mt-2 text-sm text-gray-400">
                Platforma en son eklenen ürünler.
              </p>
            </div>

            <a href="/admin/products" className="text-sm text-gray-400 hover:text-white">
              Ürün yönetimine git
            </a>
          </div>

          <div className="mt-6 grid gap-4">
            {recentProducts.map((product) => (
              <div
                key={product.id}
                className="grid gap-4 rounded-2xl bg-black/30 p-5 md:grid-cols-[1fr_auto_auto] md:items-center"
              >
                <div>
                  <h3 className="font-semibold">{product.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {product.category} • Satıcı: {product.seller}
                  </p>
                </div>

                <p className="text-xl font-bold">{product.price}</p>

                <span className={statusClass(product.status)}>
                  {product.status}
                </span>
              </div>
            ))}

            {recentProducts.length === 0 && (
              <div className="rounded-2xl bg-black/30 p-6 text-center text-gray-400">
                Henüz ürün yok.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
