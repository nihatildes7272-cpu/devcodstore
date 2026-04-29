import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

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

export default function LibraryPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    try {
      const userResult = await withTimeout(
        supabase.auth.getUser(),
        10000,
        "Kullanıcı bilgisi alınırken sunucu geç cevap verdi."
      );

      const currentUser = userResult.data.user;

      if (!currentUser) {
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(currentUser);

      const orderResult = await withTimeout(
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false }),
        15000,
        "Satın alınan ürünler yüklenirken sunucu geç cevap verdi."
      );

      if (orderResult.error) {
        setMessage("Satın alınan ürünler yüklenirken hata oluştu: " + orderResult.error.message);
        setOrders([]);
      } else {
        setOrders(orderResult.data || []);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Dosyalarım sayfası yüklenirken bilinmeyen bir hata oluştu."
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Dosyalarım</h1>
          <p className="mt-3 text-gray-400">
            Satın aldığın proje ve kod paketleri burada görünür.
          </p>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{message}</p>

            <button
              onClick={loadOrders}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {loading ? (
          <main className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            Dosyaların yükleniyor...
          </main>
        ) : (
          <>
            <section className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-gray-400">Kullanıcı</p>
                <h2 className="mt-3 break-all text-xl font-bold">
                  {user?.email}
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-gray-400">Satın Alınan Ürün</p>
                <h2 className="mt-3 text-4xl font-bold">{orders.length}</h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-gray-400">Erişim Durumu</p>
                <h2 className="mt-3 text-4xl font-bold text-green-300">Aktif</h2>
              </div>
            </section>

            <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-3xl font-bold">Satın Alınanlar</h2>
              <p className="mt-2 text-gray-400">
                Bu liste Supabase orders tablosundan gelir.
              </p>

              <div className="mt-8 grid gap-5">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/30 p-6 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300">
                        {order.status}
                      </span>

                      <h3 className="mt-4 text-2xl font-bold">
                        {order.product_title}
                      </h3>

                      <p className="mt-2 text-sm text-gray-400">
                        Satıcı: {order.seller}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        Satın alma tarihi: {formatDate(order.created_at)}
                      </p>

                      <p className="mt-1 break-all text-sm text-gray-400">
                        Sipariş No: {order.id}
                      </p>
                    </div>

                    <div className="grid gap-3 md:min-w-48">
                      <p className="text-right text-2xl font-bold">
                        {order.price}
                      </p>

                      {order.product_id ? (
                        <a
                          href={`/download/${order.product_id}`}
                          className="rounded-2xl bg-blue-600 px-6 py-3 text-center font-semibold hover:bg-blue-500"
                        >
                          Dosyayı İndir
                        </a>
                      ) : (
                        <button
                          disabled
                          className="rounded-2xl bg-gray-600 px-6 py-3 text-center font-semibold opacity-60"
                        >
                          Dosya Yok
                        </button>
                      )}

                      {order.product_id && (
                        <a
                          href={`/product/${order.product_id}`}
                          className="rounded-2xl border border-white/15 px-6 py-3 text-center text-sm font-semibold hover:bg-white/10"
                        >
                          Ürüne Git
                        </a>
                      )}
                    </div>
                  </div>
                ))}

                {orders.length === 0 && (
                  <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center">
                    <h3 className="text-2xl font-bold">Henüz satın alma yok</h3>
                    <p className="mt-2 text-gray-400">
                      Bir ürün satın aldığında burada görünecek.
                    </p>

                    <a
                      href="/products"
                      className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
                    >
                      Ürünleri Keşfet
                    </a>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
