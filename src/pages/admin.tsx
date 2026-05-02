import Link from "next/link";
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
  security_status?: string | null;
  created_at?: string;
};

type Order = {
  id: string;
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
};

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  updated_at: string;
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
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadDashboard(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const [productsResult, ordersResult, profilesResult, ticketsResult] =
        await Promise.all([
          withTimeout(
            supabase
              .from("products")
              .select("id,title,seller,category,price,status,security_status,created_at")
              .order("created_at", { ascending: false })
              .limit(100),
            15000,
            "Ürünler yüklenirken sunucu geç cevap verdi."
          ),

          withTimeout(
            supabase
              .from("orders")
              .select("id,product_id,product_title,price,seller,status,created_at")
              .order("created_at", { ascending: false })
              .limit(100),
            15000,
            "Siparişler yüklenirken sunucu geç cevap verdi."
          ),

          withTimeout(
            supabase
              .from("profiles")
              .select("id,email,full_name,account_type")
              .limit(300),
            15000,
            "Kullanıcılar yüklenirken sunucu geç cevap verdi."
          ),

          withTimeout(
            supabase
              .from("support_tickets")
              .select("id,subject,category,status,updated_at")
              .order("updated_at", { ascending: false })
              .limit(20),
            15000,
            "Destek talepleri yüklenirken sunucu geç cevap verdi."
          ),
        ]);

      if (productsResult.error) {
        setMessage("Ürünler yüklenemedi: " + productsResult.error.message);
        setProducts([]);
      } else {
        setProducts(productsResult.data || []);
      }

      if (ordersResult.error) {
        setMessage("Siparişler yüklenemedi: " + ordersResult.error.message);
        setOrders([]);
      } else {
        setOrders(ordersResult.data || []);
      }

      if (profilesResult.error) {
        setMessage("Kullanıcılar yüklenemedi: " + profilesResult.error.message);
        setProfiles([]);
      } else {
        setProfiles(profilesResult.data || []);
      }

      if (ticketsResult.error) {
        setTickets([]);
      } else {
        setTickets(ticketsResult.data || []);
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
          : "Admin paneli yüklenirken bilinmeyen hata oluştu."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const initializeDashboard = async () => {
      await loadDashboard(true);
    };

    void initializeDashboard();
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

  function formatDate(date?: string | null) {
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
    if (status === "Yayında" || status === "Tamamlandı" || status === "Çözüldü") {
      return "w-fit rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300";
    }

    if (status === "Reddedildi" || status === "Riskli" || status === "Kapandı") {
      return "w-fit rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300";
    }

    if (status === "İnceleniyor" || status === "Manuel İnceleme") {
      return "w-fit rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300";
    }

    return "w-fit rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300";
  }

  const pendingProducts = products.filter(
    (product) => product.status === "Onay Bekliyor"
  );

  const liveProducts = products.filter((product) => product.status === "Yayında");

  const riskyProducts = products.filter(
    (product) =>
      product.security_status === "Riskli" ||
      product.security_status === "Manuel İnceleme" ||
      product.security_status === "Taranmadı"
  );

  const totalRevenue = orders
    .filter((order) => order.status !== "İade Edildi")
    .reduce((sum, order) => sum + parsePrice(order.price), 0);

  const sellerCount = profiles.filter(
    (profile) => profile.account_type === "seller"
  ).length;

  const adminCards = [
    {
      title: "Ürün Yönetimi",
      description: "Ürünleri onayla, reddet, yayına al veya güvenlik kontrolü yap.",
      href: "/admin/products",
      meta: `${pendingProducts.length} onay bekliyor`,
    },
    {
      title: "Siparişler",
      description: "Siparişleri, satış durumlarını ve iade süreçlerini yönet.",
      href: "/admin/orders",
      meta: `${orders.length} sipariş`,
    },
    {
      title: "Kullanıcılar",
      description: "Kullanıcı rollerini buyer, seller veya admin olarak yönet.",
      href: "/admin/users",
      meta: `${profiles.length} kullanıcı`,
    },
    {
      title: "Güvenlik Taramaları",
      description: "Otomatik ve güçlü tarama kuyruğunu takip et.",
      href: "/admin/scan-jobs",
      meta: `${riskyProducts.length} kontrol bekliyor`,
    },
    {
      title: "Destek Talepleri",
      description: "Kullanıcı ve satıcı destek taleplerine yanıt ver.",
      href: "/admin/support",
      meta: `${tickets.length} son talep`,
    },
    {
      title: "Raporlar",
      description: "Ciro, ürün, kategori, kullanıcı ve sipariş raporlarını incele.",
      href: "/admin/reports",
      meta: formatMoney(totalRevenue),
    },
    {
      title: "Yorumlar",
      description: "Ürün yorumlarını ve puanlamaları denetle.",
      href: "/admin/reviews",
      meta: "Moderasyon",
    },
    {
      title: "İşlem Kayıtları",
      description: "Admin işlemlerini ve güvenlik loglarını kontrol et.",
      href: "/admin/logs",
      meta: "Log sistemi",
    },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-8 text-center shadow-2xl">
          <div className="animate-spin text-4xl mb-4">⚡</div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Admin paneli yükleniyor...</h1>
          <p className="mt-3 text-sm text-gray-300">
            Özet veriler hazırlanıyor.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pt-56 md:pt-0">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="mb-8 rounded-3xl border border-white/20 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Admin Merkezi</h1>
              <p className="mt-3 max-w-3xl text-gray-300 text-lg">
                devcodstore yönetimi için modern kontrol merkezi.
                Detaylı işlemler ilgili yönetim sayfalarında yapılır.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadDashboard(false)}
                disabled={refreshing}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 shadow-lg transition-all duration-200"
              >
                {refreshing ? "🔄 Yenileniyor..." : "🔄 Yenile"}
              </button>

              {lastUpdated && (
                <p className="text-xs text-gray-400">
                  Son güncelleme: {lastUpdated}
                </p>
              )}
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{message}</p>

            <button
              onClick={() => loadDashboard(false)}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          <div className="relative z-0 rounded-3xl border border-white/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-sm text-emerald-300 font-medium">💰 Toplam Ciro</p>
            <h2 className="mt-3 text-4xl font-bold text-emerald-400">{formatMoney(totalRevenue)}</h2>
          </div>

          <div className="relative z-0 rounded-3xl border border-white/20 bg-gradient-to-br from-green-500/10 to-green-600/5 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-sm text-green-300 font-medium">📦 Yayındaki Ürün</p>
            <h2 className="mt-3 text-4xl font-bold text-green-400">
              {liveProducts.length}
            </h2>
          </div>

          <div className="relative z-0 rounded-3xl border border-white/20 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-sm text-yellow-300 font-medium">⏳ Onay Bekleyen</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-400">
              {pendingProducts.length}
            </h2>
          </div>

          <div className="relative z-0 rounded-3xl border border-white/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-sm text-blue-300 font-medium">👥 Satıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-400">{sellerCount}</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Yönetim Kısayolları</h2>
          <p className="mt-2 text-sm text-gray-400">
            Ana panel artık sade. Detaylı işlemler için ilgili bölüme git.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {adminCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group relative z-0 rounded-3xl border border-white/20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 transition-all duration-300 hover:border-blue-500/40 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-purple-500/10 hover:shadow-xl hover:scale-105 backdrop-blur-sm"
              >
                <p className="w-fit rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
                  {card.meta}
                </p>

                <h3 className="mt-5 text-xl font-bold group-hover:text-blue-300 transition-colors">{card.title}</h3>

                <p className="mt-3 text-sm leading-6 text-gray-400 group-hover:text-gray-300 transition-colors">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="relative z-0 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Onay Bekleyen Ürünler</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Son gönderilen ürünler
                </p>
              </div>

              <Link href="/admin/products" className="text-sm text-blue-300 hover:text-blue-200">
                Aç
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {pendingProducts.slice(0, 4).map((product) => (
                <div key={product.id} className="rounded-2xl bg-black/30 p-4">
                  <h3 className="font-semibold">{product.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{product.seller}</p>
                  <p className="mt-1 text-sm text-gray-500">{product.price}</p>
                </div>
              ))}

              {pendingProducts.length === 0 && (
                <div className="rounded-2xl bg-black/30 p-6 text-center text-gray-400">
                  Onay bekleyen ürün yok.
                </div>
              )}
            </div>
          </div>

          <div className="relative z-0 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Son Siparişler</h2>
                <p className="mt-1 text-sm text-gray-400">Yeni satış kayıtları</p>
              </div>

              <Link href="/admin/orders" className="text-sm text-blue-300 hover:text-blue-200">
                Aç
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {orders.slice(0, 4).map((order) => (
                <div key={order.id} className="rounded-2xl bg-black/30 p-4">
                  <h3 className="font-semibold">{order.product_title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{order.seller}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="font-bold">{order.price}</p>
                    <span className={statusClass(order.status)}>{order.status}</span>
                  </div>
                </div>
              ))}

              {orders.length === 0 && (
                <div className="rounded-2xl bg-black/30 p-6 text-center text-gray-400">
                  Henüz sipariş yok.
                </div>
              )}
            </div>
          </div>

          <div className="relative z-0 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Destek Talepleri</h2>
                <p className="mt-1 text-sm text-gray-400">Son destek hareketleri</p>
              </div>

              <Link href="/admin/support" className="text-sm text-blue-300 hover:text-blue-200">
                Aç
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {tickets.slice(0, 4).map((ticket) => (
                <div key={ticket.id} className="rounded-2xl bg-black/30 p-4">
                  <h3 className="font-semibold">{ticket.subject}</h3>
                  <p className="mt-1 text-sm text-gray-400">{ticket.category}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      {formatDate(ticket.updated_at)}
                    </p>
                    <span className={statusClass(ticket.status)}>{ticket.status}</span>
                  </div>
                </div>
              ))}

              {tickets.length === 0 && (
                <div className="rounded-2xl bg-black/30 p-6 text-center text-gray-400">
                  Destek talebi yok.
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
