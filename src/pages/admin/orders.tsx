import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type Order = {
  id: string;
  user_id: string | null;
  product_id: string | null;
  product_title: string;
  price: string;
  seller: string;
  seller_id?: string | null;
  status: string;
  created_at: string;
};

type OrderTab = "Tümü" | "Tamamlandı" | "Beklemede" | "İade Edildi";

const adminOrdersPageSize = 25;

const tabs: OrderTab[] = ["Tümü", "Tamamlandı", "Beklemede", "İade Edildi"];

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<OrderTab>("Tümü");
  const [search, setSearch] = useState("");
  const [openManageId, setOpenManageId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadOrders(showLoading = true, targetPage = page) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const result = await withTimeout(
        supabase
          .from("orders")
          .select("*", { count: "planned" })
          .order("created_at", { ascending: false })
          .range(
            (targetPage - 1) * adminOrdersPageSize,
            targetPage * adminOrdersPageSize - 1
          ),
        15000,
        "Siparişler yüklenirken sunucu geç cevap verdi."
      );

      if (result.error) {
        setMessage("Siparişler yüklenemedi: " + result.error.message);
        setOrders([]);
        setTotalCount(0);
      } else {
        setOrders(result.data || []);
        setTotalCount(result.count || 0);
        setLastUpdated(
          new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Siparişler yüklenirken bilinmeyen hata oluştu."
      );
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrders(true, page);

    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadOrders(false, page);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      loadOrders(false, page);
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);


  useEffect(() => {
    loadOrders(true, page);
  }, [page]);

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

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function statusClass(status: string) {
    if (status === "Tamamlandı") {
      return "rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300";
    }

    if (status === "İade Edildi") {
      return "rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300";
    }

    if (status === "Beklemede") {
      return "rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300";
    }

    return "rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300";
  }

  async function updateOrderStatus(orderId: string, status: string) {
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      setMessage("Sipariş durumu güncellenemedi: " + error.message);
      return;
    }

    setMessage(`Sipariş durumu "${status}" olarak güncellendi.`);
    setOpenManageId(null);
    await loadOrders(false, page);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / adminOrdersPageSize));

  const completedOrders = orders.filter((order) => order.status === "Tamamlandı");
  const pendingOrders = orders.filter((order) => order.status === "Beklemede");
  const refundedOrders = orders.filter((order) => order.status === "İade Edildi");

  const totalRevenue = orders
    .filter((order) => order.status !== "İade Edildi")
    .reduce((sum, order) => sum + parsePrice(order.price), 0);

  const completedRevenue = completedOrders.reduce(
    (sum, order) => sum + parsePrice(order.price),
    0
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesTab = activeTab === "Tümü" || order.status === activeTab;

      const searchText = `${order.id} ${order.product_title} ${order.seller} ${
        order.price
      } ${order.status} ${order.product_id || ""} ${order.user_id || ""}`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, search]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Siparişler yükleniyor...
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
              <h1 className="text-4xl font-bold">Admin Sipariş Yönetimi</h1>
              <p className="mt-3 text-gray-400">
                Siparişleri, satış durumlarını ve iade süreçlerini sade bir panelden yönet.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadOrders(false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>

              {lastUpdated && (
                <p className="text-xs text-gray-500">
                  Son güncelleme: {lastUpdated}
                </p>
              )}
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            <p>{message}</p>

            <button
              onClick={() => loadOrders(false)}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Sipariş</p>
            <h2 className="mt-3 text-4xl font-bold">{totalCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Tamamlanan</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">
              {completedOrders.length}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Bekleyen</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">
              {pendingOrders.length}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">İade Edilen</p>
            <h2 className="mt-3 text-4xl font-bold text-red-300">
              {refundedOrders.length}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Net Ciro</p>
            <h2 className="mt-3 text-3xl font-bold">
              {formatMoney(totalRevenue)}
            </h2>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Tamamlanan Sipariş Cirosu</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">
              {formatMoney(completedRevenue)}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Gösterilen Sipariş</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">
              {filteredOrders.length}
            </h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid gap-3 md:grid-cols-4">
            {tabs.map((tab) => {
              const count =
                tab === "Tümü"
                  ? totalCount
                  : orders.filter((order) => order.status === tab).length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={
                    activeTab === tab
                      ? "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                      : "rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
                  }
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">{activeTab}</h2>
              <p className="mt-2 text-sm text-gray-400">
                Sipariş kartlarında sadece özet görünür. Detay için Durum Yönet panelini aç.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ürün, satıcı, sipariş no veya durum ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500 md:w-96"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {filteredOrders.map((order) => {
              const isOpen = openManageId === order.id;

              return (
                <div key={order.id} className="rounded-3xl bg-black/30 p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-3">
                        <span className={statusClass(order.status)}>
                          {order.status}
                        </span>

                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                          {order.price}
                        </span>
                      </div>

                      <h3 className="mt-4 text-2xl font-bold">
                        {order.product_title}
                      </h3>

                      <div className="mt-3 grid gap-1 text-sm text-gray-400">
                        <p>Satıcı: {order.seller}</p>
                        <p>Tarih: {formatDate(order.created_at)}</p>
                        <p className="break-all">Sipariş No: {order.id}</p>
                        {order.product_id && (
                          <p className="break-all">Ürün ID: {order.product_id}</p>
                        )}
                        {order.user_id && (
                          <p className="break-all">Alıcı ID: {order.user_id}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 lg:min-w-48">
                      {order.product_id && (
                        <a
                          href={`/product/${order.product_id}`}
                          className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                        >
                          Ürünü Aç
                        </a>
                      )}

                      <button
                        onClick={() => setOpenManageId(isOpen ? null : order.id)}
                        className={
                          isOpen
                            ? "rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                            : "rounded-2xl border border-blue-500/30 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/10"
                        }
                      >
                        Durum Yönet
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <section className="mt-6 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
                      <h4 className="text-xl font-bold">Sipariş Durumu</h4>
                      <p className="mt-2 text-sm text-gray-400">
                        Sipariş durumunu değiştir. İade edilen siparişler net cirodan düşer.
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <button
                          onClick={() => updateOrderStatus(order.id, "Tamamlandı")}
                          className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold hover:bg-green-500"
                        >
                          Tamamlandı Yap
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order.id, "Beklemede")}
                          className="rounded-2xl border border-yellow-500/30 px-4 py-3 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/10"
                        >
                          Beklemede Yap
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order.id, "İade Edildi")}
                          className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold hover:bg-red-500"
                        >
                          İade Edildi Yap
                        </button>
                      </div>

                      <div className="mt-5 rounded-2xl bg-black/30 p-4 text-sm text-gray-300">
                        <p>Mevcut durum: {order.status}</p>
                        <p className="mt-1">Tutar: {order.price}</p>
                        <p className="mt-1">Ürün: {order.product_title}</p>
                      </div>
                    </section>
                  )}
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center">
                <h3 className="text-2xl font-bold">Sipariş bulunamadı</h3>
                <p className="mt-2 text-gray-400">
                  Bu sekmede veya aramada eşleşen sipariş yok.
                </p>
              </div>
            )}
          </div>

          {totalCount > adminOrdersPageSize && (
            <section className="mt-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/30 p-5 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-400">
                Sayfa {page} / {totalPages} — Toplam sipariş: {totalCount}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                >
                  Önceki
                </button>

                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </section>
          )}

        </section>
      </section>
    </main>
  );
}
