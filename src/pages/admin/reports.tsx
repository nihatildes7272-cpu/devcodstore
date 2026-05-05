import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  status: string;
  created_at?: string;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "buyer" | "seller" | "admin";
  created_at: string | null;
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
  gross_amount?: number | null;
  commission_rate?: number | null;
  commission_amount?: number | null;
  seller_net_amount?: number | null;
};

export default function AdminReportsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading) return;

    const timer = setTimeout(() => {
      setMessage((current) =>
        current || "Sunucu yanıtı gecikti. Sayfayı yenileyebilir veya tekrar deneyebilirsin."
      );
      setLoading(false);
    }, 12000);

    return () => clearTimeout(timer);
  }, [loading]);


  async function loadReports() {
    setLoading(true);
    setMessage("");

    const [productsResult, profilesResult, ordersResult] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("orders").select("*"),
    ]);

    if (productsResult.error) {
      setMessage("Ürün raporları yüklenemedi: " + productsResult.error.message);
    }

    if (profilesResult.error) {
      setMessage("Kullanıcı raporları yüklenemedi: " + profilesResult.error.message);
    }

    if (ordersResult.error) {
      setMessage("Sipariş raporları yüklenemedi: " + ordersResult.error.message);
    }

    setProducts(productsResult.data || []);
    setProfiles(profilesResult.data || []);
    setOrders(ordersResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  function parsePrice(price: string) {
    const normalized = price
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");

    return Number.parseFloat(normalized) || 0;
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(value);
  }

  const validOrders = orders.filter((order) => order.status !== "İade Edildi");

  function grossAmount(order: Order) {
    return order.gross_amount ?? parsePrice(order.price);
  }

  function commissionAmount(order: Order) {
    if (order.commission_amount !== null && order.commission_amount !== undefined) {
      return order.commission_amount;
    }

    return grossAmount(order) * ((order.commission_rate ?? 20) / 100);
  }

  function sellerNetAmount(order: Order) {
    if (order.seller_net_amount !== null && order.seller_net_amount !== undefined) {
      return order.seller_net_amount;
    }

    return grossAmount(order) - commissionAmount(order);
  }

  const totalRevenue = validOrders.reduce((total, order) => total + grossAmount(order), 0);

  const platformRevenue = validOrders.reduce((total, order) => total + commissionAmount(order), 0);
  const sellerPayoutTotal = validOrders.reduce((total, order) => total + sellerNetAmount(order), 0);

  const liveProducts = products.filter((product) => product.status === "Yayında").length;
  const pendingProducts = products.filter((product) => product.status === "Onay Bekliyor").length;
  const rejectedProducts = products.filter((product) => product.status === "Reddedildi").length;
  const unpublishedProducts = products.filter((product) => product.status === "Yayından Kaldırıldı").length;

  const buyerCount = profiles.filter((profile) => profile.account_type === "buyer").length;
  const sellerCount = profiles.filter((profile) => profile.account_type === "seller").length;
  const adminCount = profiles.filter((profile) => profile.account_type === "admin").length;

  const completedOrders = orders.filter((order) => order.status === "Tamamlandı").length;
  const pendingOrders = orders.filter((order) => order.status === "Beklemede").length;
  const refundedOrders = orders.filter((order) => order.status === "İade Edildi").length;

  const categoryStats = products.reduce<Record<string, number>>((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});

  const sellerStats = products.reduce<Record<string, number>>((acc, product) => {
    acc[product.seller] = (acc[product.seller] || 0) + 1;
    return acc;
  }, {});

  const monthlyStats = orders.reduce<
    Record<string, { orders: number; revenue: number; commission: number; sellerNet: number }>
  >(
    (acc, order) => {
      const date = new Date(order.created_at);
      const key = date.toLocaleDateString("tr-TR", {
        month: "long",
        year: "numeric",
      });

      if (!acc[key]) {
        acc[key] = {
          orders: 0,
          revenue: 0,
          commission: 0,
          sellerNet: 0,
        };
      }

      acc[key].orders += 1;

      if (order.status !== "İade Edildi") {
        acc[key].revenue += grossAmount(order);
        acc[key].commission += commissionAmount(order);
        acc[key].sellerNet += sellerNetAmount(order);
      }

      return acc;
    },
    {}
  );

  const categoryList = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
  const sellerList = Object.entries(sellerStats).sort((a, b) => b[1] - a[1]);
  const monthlyList = Object.entries(monthlyStats).reverse();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Raporlar yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-transparent p-8 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Sistem Raporları</h1>
              <p className="mt-3 text-gray-300">
                Ciro, kullanıcı, ürün ve sipariş istatistiklerini genel olarak incele.
              </p>
            </div>
            <button
              onClick={loadReports}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:scale-105 active:scale-95"
            >
              Raporları Yenile
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {[
            { label: "Toplam Ciro", value: formatMoney(totalRevenue), color: "text-emerald-400" },
            { label: "Platform Kazancı", value: formatMoney(platformRevenue), color: "text-blue-400", sub: "Sipariş komisyonlarından" },
            { label: "Satıcı Net Payı", value: formatMoney(sellerPayoutTotal), color: "text-cyan-300" },
            { label: "Toplam Kullanıcı", value: profiles.length, color: "text-white" },
          ].map((stat, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
              <h2 className={`mt-3 text-3xl md:text-4xl font-black ${stat.color}`}>{stat.value}</h2>
              {stat.sub && <p className="mt-2 text-xs font-medium text-gray-500">{stat.sub}</p>}
            </div>
          ))}
        </section>

        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {[
            { label: "Toplam Ürün", value: products.length, color: "text-white" },
            { label: "Yayında", value: liveProducts, color: "text-green-400" },
            { label: "Onay Bekliyor", value: pendingProducts, color: "text-yellow-400" },
            { label: "Reddedildi / Kaldırıldı", value: rejectedProducts + unpublishedProducts, color: "text-red-400" },
          ].map((stat, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
              <h2 className={`mt-3 text-4xl font-black ${stat.color}`}>{stat.value}</h2>
            </div>
          ))}
        </section>

        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {[
            { label: "Alıcı", value: buyerCount, color: "text-green-400" },
            { label: "Satıcı", value: sellerCount, color: "text-blue-400" },
            { label: "Admin", value: adminCount, color: "text-purple-400" },
          ].map((stat, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
              <h2 className={`mt-3 text-4xl font-black ${stat.color}`}>{stat.value}</h2>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
            <h2 className="text-2xl font-black tracking-tight mb-6">Sipariş Durumları</h2>

            <div className="mt-6 grid gap-4">
              <div className="group rounded-2xl border border-white/5 bg-white/5 p-5 transition hover:bg-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-300">Tamamlandı</span>
                  <span className="text-xl font-black text-green-400">{completedOrders}</span>
                </div>
              </div>

              <div className="group rounded-2xl border border-white/5 bg-white/5 p-5 transition hover:bg-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-300">Beklemede</span>
                  <span className="text-xl font-black text-yellow-400">{pendingOrders}</span>
                </div>
              </div>

              <div className="group rounded-2xl border border-white/5 bg-white/5 p-5 transition hover:bg-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-300">İade Edildi</span>
                  <span className="text-xl font-black text-red-400">{refundedOrders}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
            <h2 className="text-2xl font-black tracking-tight mb-6">Kategori Dağılımı</h2>

            <div className="mt-6 grid gap-4">
              {categoryList.map(([category, count]) => (
                <div key={category} className="group rounded-2xl border border-white/5 bg-white/5 p-5 transition hover:bg-white/10">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-300">{category}</span>
                    <span className="text-lg font-black text-white">{count} ürün</span>
                  </div>
                </div>
              ))}

              {categoryList.length === 0 && (
                <p className="text-sm text-gray-400">Henüz kategori verisi yok.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
            <h2 className="text-2xl font-black tracking-tight mb-6">Satıcı Ürünleri</h2>

            <div className="mt-6 grid gap-4">
              {sellerList.slice(0, 5).map(([seller, count]) => (
                <div key={seller} className="group rounded-2xl border border-white/5 bg-white/5 p-5 transition hover:bg-white/10">
                  <div className="flex items-center justify-between gap-4">
                    <span className="truncate font-medium text-gray-300">{seller}</span>
                    <span className="text-lg font-black text-white">{count} ürün</span>
                  </div>
                </div>
              ))}

              {sellerList.length === 0 && (
                <p className="text-sm text-gray-400">Henüz satıcı verisi yok.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <h2 className="text-2xl font-black tracking-tight mb-6">Aylık Sipariş ve Ciro</h2>
          <p className="mt-2 text-sm text-gray-400">
            Orders tablosundaki tarihlere göre hesaplanır.
          </p>

          <div className="mt-6 grid gap-4">
            {monthlyList.map(([month, data]) => (
              <div
                key={month}
                className="group grid gap-4 rounded-3xl border border-white/5 bg-white/5 p-6 transition hover:bg-white/[0.08] md:grid-cols-4 md:items-center"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Dönem</p>
                  <h3 className="mt-1 text-xl font-black group-hover:text-blue-300 transition-colors">{month}</h3>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Sipariş</p>
                  <h3 className="mt-1 text-xl font-black text-white">{data.orders}</h3>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Ciro</p>
                  <h3 className="mt-1 text-xl font-black text-emerald-400">{formatMoney(data.revenue)}</h3>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Komisyon / Net</p>
                  <h3 className="mt-1 text-lg font-black text-blue-300">{formatMoney(data.commission)}</h3>
                  <p className="mt-1 text-xs text-gray-500">Satıcı: {formatMoney(data.sellerNet)}</p>
                </div>
              </div>
            ))}

            {monthlyList.length === 0 && (
              <div className="rounded-3xl bg-black/30 p-8 text-center text-gray-400">
                Henüz aylık rapor oluşturacak sipariş yok.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
