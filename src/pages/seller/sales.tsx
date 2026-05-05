import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import SellerPanelNav from "@/components/SellerPanelNav";

type Order = {
  id: string;
  product_id: string | null;
  product_title: string;
  price: string;
  seller: string;
  seller_id: string | null;
  status: string;
  created_at: string;
  gross_amount?: number | null;
  commission_rate?: number | null;
  commission_amount?: number | null;
  seller_net_amount?: number | null;
};

export default function SellerSalesPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Satışlar yüklenemedi: " + error.message);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function parsePrice(value: string) {
    const clean = value.replace(/[^\d,.-]/g, "");
    const normalized = clean.includes(",")
      ? clean.replace(/\./g, "").replace(",", ".")
      : /\.\d{1,2}$/.test(clean)
        ? clean
        : clean.replace(/\./g, "");
    const numberValue = Number(normalized);
    return Number.isFinite(numberValue) ? numberValue : 0;
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
    if (status === "Tamamlandı") return "rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-300";
    if (status === "İade Edildi") return "rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300";
    return "rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-300";
  }

  function grossAmount(order: Order) {
    return Number(order.gross_amount ?? parsePrice(order.price));
  }

  function commissionAmount(order: Order) {
    if (typeof order.commission_amount === "number") return order.commission_amount;
    return grossAmount(order) * (Number(order.commission_rate ?? 20) / 100);
  }

  function sellerNetAmount(order: Order) {
    if (typeof order.seller_net_amount === "number") return order.seller_net_amount;
    return grossAmount(order) - commissionAmount(order);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Satışlarım yükleniyor...
      </main>
    );
  }

  const completedOrders = orders.filter((order) => order.status === "Tamamlandı");
  const grossRevenue = completedOrders.reduce((sum, order) => sum + grossAmount(order), 0);
  const totalCommission = completedOrders.reduce((sum, order) => sum + commissionAmount(order), 0);
  const totalRevenue = completedOrders.reduce((sum, order) => sum + sellerNetAmount(order), 0);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Satışlarım</h1>
              <p className="mt-3 text-gray-400">
                Ürünlerinden oluşan sipariş kayıtlarını ve kazancını takip et.
              </p>
            </div>

            <button
              onClick={loadOrders}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Yenile
            </button>
          </div>
        </section>

        <SellerPanelNav />

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Satış</p>
            <h2 className="mt-3 text-4xl font-bold">{completedOrders.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Net Kazanç</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">
              {formatMoney(totalRevenue)}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Platform Komisyonu</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">
              {formatMoney(totalCommission)}
            </h2>
            <p className="mt-2 text-xs text-gray-500">Brüt: {formatMoney(grossRevenue)}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Sipariş Kaydı</p>
            <h2 className="mt-3 text-4xl font-bold">{orders.length}</h2>
          </div>
        </section>

        <section className="mt-10 grid gap-5">
          {orders.map((order) => (
            <div key={order.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className={statusClass(order.status)}>{order.status}</span>
                  <h2 className="mt-4 text-2xl font-bold">{order.product_title}</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    Tarih: {formatDate(order.created_at)}
                  </p>
                  <p className="mt-1 break-all text-sm text-gray-500">
                    Sipariş No: {order.id}
                  </p>
                </div>

                <div className="grid gap-3 md:text-right">
                  <div>
                    <p className="text-3xl font-bold">{formatMoney(sellerNetAmount(order))}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Brüt {formatMoney(grossAmount(order))} · Komisyon {formatMoney(commissionAmount(order))}
                    </p>
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
            </div>
          ))}

          {orders.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
              Henüz satış kaydı yok.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
