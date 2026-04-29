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

  const validOrders = orders.filter((order) => order.status !== "İade Edildi");

  const totalRevenue = validOrders.reduce((total, order) => {
    return total + parsePrice(order.price);
  }, 0);

  const platformRevenue = Math.round(totalRevenue * 0.15);

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

  const monthlyStats = orders.reduce<Record<string, { orders: number; revenue: number }>>(
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
        };
      }

      acc[key].orders += 1;

      if (order.status !== "İade Edildi") {
        acc[key].revenue += parsePrice(order.price);
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

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ciro</p>
            <h2 className="mt-3 text-4xl font-bold">{formatMoney(totalRevenue)}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Platform Kazancı</p>
            <h2 className="mt-3 text-4xl font-bold">{formatMoney(platformRevenue)}</h2>
            <p className="mt-2 text-xs text-gray-500">Demo oran: %15</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Sipariş</p>
            <h2 className="mt-3 text-4xl font-bold">{orders.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Kullanıcı</p>
            <h2 className="mt-3 text-4xl font-bold">{profiles.length}</h2>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ürün</p>
            <h2 className="mt-3 text-4xl font-bold">{products.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yayında</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{liveProducts}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Onay Bekliyor</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">{pendingProducts}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Reddedildi / Kaldırıldı</p>
            <h2 className="mt-3 text-4xl font-bold text-red-300">
              {rejectedProducts + unpublishedProducts}
            </h2>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Alıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{buyerCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Satıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">{sellerCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Admin</p>
            <h2 className="mt-3 text-4xl font-bold text-purple-300">{adminCount}</h2>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Sipariş Durumları</h2>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span>Tamamlandı</span>
                  <span className="font-bold text-green-300">{completedOrders}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span>Beklemede</span>
                  <span className="font-bold text-yellow-300">{pendingOrders}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span>İade Edildi</span>
                  <span className="font-bold text-red-300">{refundedOrders}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Kategori Dağılımı</h2>

            <div className="mt-6 grid gap-4">
              {categoryList.map(([category, count]) => (
                <div key={category} className="rounded-2xl bg-black/30 p-5">
                  <div className="flex items-center justify-between">
                    <span>{category}</span>
                    <span className="font-bold">{count} ürün</span>
                  </div>
                </div>
              ))}

              {categoryList.length === 0 && (
                <p className="text-sm text-gray-400">Henüz kategori verisi yok.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Satıcı Ürünleri</h2>

            <div className="mt-6 grid gap-4">
              {sellerList.slice(0, 5).map(([seller, count]) => (
                <div key={seller} className="rounded-2xl bg-black/30 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="truncate">{seller}</span>
                    <span className="font-bold">{count} ürün</span>
                  </div>
                </div>
              ))}

              {sellerList.length === 0 && (
                <p className="text-sm text-gray-400">Henüz satıcı verisi yok.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Aylık Sipariş ve Ciro</h2>
          <p className="mt-2 text-sm text-gray-400">
            Orders tablosundaki tarihlere göre hesaplanır.
          </p>

          <div className="mt-6 grid gap-4">
            {monthlyList.map(([month, data]) => (
              <div
                key={month}
                className="grid gap-4 rounded-2xl bg-black/30 p-5 md:grid-cols-3 md:items-center"
              >
                <div>
                  <p className="text-sm text-gray-400">Dönem</p>
                  <h3 className="mt-1 text-xl font-bold">{month}</h3>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Sipariş</p>
                  <h3 className="mt-1 text-xl font-bold">{data.orders}</h3>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Ciro</p>
                  <h3 className="mt-1 text-xl font-bold">{formatMoney(data.revenue)}</h3>
                </div>
              </div>
            ))}

            {monthlyList.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center">
                Henüz aylık rapor oluşturacak sipariş yok.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
