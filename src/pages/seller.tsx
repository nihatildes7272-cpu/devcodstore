import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import SellerPanelNav from "@/components/SellerPanelNav";
import { ensureSellerProfile } from "@/lib/sellerAccess";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  seller_id: string | null;
  status: string;
  security_status?: string | null;
  image_url?: string | null;
  file_size?: number | null;
  created_at?: string;
};

type Order = {
  id: string;
  product_id: string | null;
  product_title: string;
  price: string;
  seller: string;
  seller_id: string | null;
  status: string;
  created_at: string;
};

export default function SellerDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storageQuotaBytes, setStorageQuotaBytes] = useState(2147483648);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    setUser(userData.user);

    const { profile: profileData, error: sellerError } = await ensureSellerProfile(
      userData.user.id
    );

    if (sellerError) {
      setMessage(sellerError);
    }

    setStorageQuotaBytes(profileData?.storage_quota_bytes || 2147483648);

    const [productsResult, ordersResult] = await Promise.all([
      supabase
        .from("products")
        .select("id,title,category,price,seller,seller_id,status,security_status,image_url,file_size,created_at")
        .eq("seller_id", userData.user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("orders")
        .select("*")
        .eq("seller_id", userData.user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (productsResult.error) {
      setMessage("Ürünlerin yüklenemedi: " + productsResult.error.message);
      setProducts([]);
    } else {
      setProducts(productsResult.data || []);
    }

    if (ordersResult.error) {
      setOrders([]);
    } else {
      setOrders(ordersResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function formatBytes(value: number) {
    if (!value) return "0 B";

    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;

    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function parsePrice(value: string) {
    const numberText = value.replace(/[^\d]/g, "");
    return Number(numberText || 0);
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function statusClass(status: string) {
    if (status === "Yayında" || status === "Tamamlandı") {
      return "rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-300";
    }

    if (status === "Reddedildi") {
      return "rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300";
    }

    if (status === "Yayından Kaldırıldı") {
      return "rounded-full bg-gray-500/20 px-3 py-1 text-xs text-gray-300";
    }

    return "rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-300";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Satıcı paneli yükleniyor...
      </main>
    );
  }

  const pendingCount = products.filter((item) => item.status === "Onay Bekliyor").length;
  const liveCount = products.filter((item) => item.status === "Yayında").length;
  const completedOrders = orders.filter((order) => order.status === "Tamamlandı");
  const totalRevenue = completedOrders.reduce((sum, order) => sum + parsePrice(order.price), 0);
  const usedStorageBytes = products.reduce((sum, product) => sum + (product.file_size || 0), 0);
  const storagePercent = Math.min(100, Math.round((usedStorageBytes / storageQuotaBytes) * 100));

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Satıcı Paneli</h1>
              <p className="mt-3 text-gray-400">
                Ürünlerini, satışlarını ve mağazanı sade bir merkezden yönet.
              </p>
              <p className="mt-2 break-all text-sm text-gray-500">{user?.email}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/seller/new"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
              >
                Yeni Ürün Yükle
              </a>

              {user && (
                <a
                  href={`/seller-store/${user.id}`}
                  className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  Mağazamı Gör
                </a>
              )}
            </div>
          </div>
        </section>

        <SellerPanelNav />

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Toplam Ürün</p>
            <h2 className="mt-4 text-4xl font-black">{products.length}</h2>
          </div>

          <div className="rounded-3xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-400/70">Yayında</p>
            <h2 className="mt-4 text-4xl font-black text-green-400">{liveCount}</h2>
          </div>

          <div className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400/70">Onay Bekleyen</p>
            <h2 className="mt-4 text-4xl font-black text-yellow-400">{pendingCount}</h2>
          </div>

          <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/70">Kazanç</p>
            <h2 className="mt-4 text-3xl font-black text-blue-400">{formatMoney(totalRevenue)}</h2>
          </div>

          <div className="col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm md:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Depolama</p>
              <span className="text-xs font-bold text-gray-500">%{storagePercent}</span>
            </div>
            <h2 className="mt-2 text-2xl font-black">{formatBytes(usedStorageBytes)}</h2>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-tight">Son Ürünlerim</h2>
              <a href="/seller/products" className="text-sm text-blue-300 hover:text-blue-200">
                Tümünü gör
              </a>
            </div>

            <div className="grid gap-4">
              {products.slice(0, 4).map((product) => (
                <div key={product.id} className="group flex items-center gap-4 rounded-2xl bg-white/5 border border-white/5 p-4 transition hover:bg-white/10">
                  <div className="flex gap-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-16 w-20 rounded-xl object-cover shadow-lg grayscale-[0.5] group-hover:grayscale-0 transition-all"
                      />
                    )}

                    <div className="flex-1">
                      <h3 className="font-bold group-hover:text-blue-300 transition-colors">{product.title}</h3>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {product.category} • {product.price}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={statusClass(product.status)}>{product.status}</span>
                        {product.security_status && (
                          <span className="text-[10px] uppercase font-bold text-gray-500">{product.security_status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {products.length === 0 && (
                <div className="rounded-2xl bg-black/30 p-6 text-center text-gray-400">
                  Henüz ürün eklemedin.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Son Satışlarım</h2>
              <a href="/seller/sales" className="text-sm text-blue-300 hover:text-blue-200">
                Tümünü gör
              </a>
            </div>

            <div className="mt-6 grid gap-4">
              {orders.slice(0, 4).map((order) => (
                <div key={order.id} className="rounded-2xl bg-black/30 p-4">
                  <h3 className="font-semibold">{order.product_title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{order.price}</p>
                  <span className={statusClass(order.status)}>{order.status}</span>
                </div>
              ))}

              {orders.length === 0 && (
                <div className="rounded-2xl bg-black/30 p-6 text-center text-gray-400">
                  Henüz satış kaydı yok.
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
