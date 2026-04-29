import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

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
  account_type: string | null;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
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

  const [search, setSearch] = useState("");

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (orderError) {
      setMessage("Siparişler yüklenirken hata oluştu: " + orderError.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders(orderData || []);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,email,full_name,account_type");

    setProfiles(profileData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function getCustomer(order: Order) {
    const profile = profiles.find((item) => item.id === order.user_id);

    return {
      name: profile?.full_name || "Bilinmeyen Kullanıcı",
      email: profile?.email || "E-posta yok",
    };
  }

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
      return "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "İade Edildi") {
      return "w-fit rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    return "w-fit rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
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

    await loadOrders();
  }

  const filteredOrders = orders.filter((order) => {
    const customer = getCustomer(order);

    const text = `${order.product_title} ${order.seller} ${order.price} ${order.status} ${customer.name} ${customer.email}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const totalRevenue = orders.reduce((total, order) => {
    if (order.status === "İade Edildi") return total;
    return total + parsePrice(order.price);
  }, 0);

  const completedOrders = orders.filter((order) => order.status === "Tamamlandı").length;
  const refundedOrders = orders.filter((order) => order.status === "İade Edildi").length;
  const pendingOrders = orders.filter((order) => order.status === "Beklemede").length;

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

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Sipariş</p>
            <h2 className="mt-3 text-4xl font-bold">{orders.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ciro</p>
            <h2 className="mt-3 text-4xl font-bold">{formatMoney(totalRevenue)}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Tamamlanan</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{completedOrders}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">İade / Bekleyen</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">
              {refundedOrders + pendingOrders}
            </h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerçek Sipariş Listesi</h2>
              <p className="mt-2 text-sm text-gray-400">
                Kullanıcıların oluşturduğu siparişler burada görünür.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sipariş, müşteri, ürün ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500 md:w-80"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {filteredOrders.map((order) => {
              const customer = getCustomer(order);

              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-5 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="max-w-2xl">
                    <h3 className="text-xl font-semibold">{order.product_title}</h3>

                    <div className="mt-2 grid gap-1 text-sm text-gray-400">
                      <p>Sipariş No: {order.id}</p>
                      <p>Müşteri: {customer.name}</p>
                      <p>E-posta: {customer.email}</p>
                      <p>Satıcı: {order.seller}</p>
                      <p>Tarih: {formatDate(order.created_at)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:min-w-56 md:text-right">
                    <p className="text-3xl font-bold">{order.price}</p>

                    <span className={statusClass(order.status)}>
                      {order.status}
                    </span>

                    <div className="grid gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, "Tamamlandı")}
                        className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-500"
                      >
                        Tamamlandı Yap
                      </button>

                      <button
                        onClick={() => updateOrderStatus(order.id, "Beklemede")}
                        className="rounded-2xl border border-yellow-500/30 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/10"
                      >
                        Beklemeye Al
                      </button>

                      <button
                        onClick={() => updateOrderStatus(order.id, "İade Edildi")}
                        className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
                      >
                        İade Edildi Yap
                      </button>
                    </div>

                    {order.product_id && (
                      <a
                        href={`/product/${order.product_id}`}
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Ürünü Aç
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center">
                <h3 className="text-2xl font-bold">Sipariş bulunamadı</h3>
                <p className="mt-2 text-gray-400">
                  Henüz sipariş yok veya arama sonucu boş.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
