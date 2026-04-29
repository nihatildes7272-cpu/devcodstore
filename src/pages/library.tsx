import { useEffect, useRef, useState } from "react";
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

type LibraryUser = {
  id: string;
  email: string | null;
};

type BrowserSession = {
  access_token: string;
  user: LibraryUser;
};

function timeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string
): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function getStoredSupabaseSession(): BrowserSession | null {
  if (typeof window === "undefined") return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const keys: string[] = [];

  try {
    if (supabaseUrl) {
      const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
      keys.push(`sb-${projectRef}-auth-token`);
    }
  } catch {
    // Devam et, aşağıda tüm sb-* auth key'leri aranacak.
  }

  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);

    if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
      keys.push(key);
    }
  }

  const uniqueKeys = Array.from(new Set(keys));

  for (const key of uniqueKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const session = parsed?.currentSession || parsed?.session || parsed;
      const user = session?.user || parsed?.user;

      if (session?.access_token && user?.id) {
        return {
          access_token: session.access_token,
          user: {
            id: user.id,
            email: user.email || null,
          },
        };
      }
    } catch {
      // Bu key uygun değilse diğerine geç.
    }
  }

  return null;
}

async function fetchOrdersWithToken(session: BrowserSession): Promise<Order[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase bağlantı bilgileri eksik.");
  }

  const query =
    "/rest/v1/orders" +
    "?select=id,user_id,product_id,product_title,price,seller,status,created_at" +
    `&user_id=eq.${encodeURIComponent(session.user.id)}` +
    "&order=created_at.desc";

  const response = await timeout(
    fetch(`${supabaseUrl}${query}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${session.access_token}`,
      },
    }),
    12000,
    "Siparişler 12 saniye içinde yüklenemedi."
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Siparişler yüklenemedi: ${response.status} ${errorText}`);
  }

  return response.json();
}

export default function LibraryPage() {
  const mountedRef = useRef(true);

  const [user, setUser] = useState<LibraryUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [debugText, setDebugText] = useState("");

  async function getCurrentSession(): Promise<BrowserSession | null> {
    setDebugText("Tarayıcı oturumu kontrol ediliyor...");

    const storedSession = getStoredSupabaseSession();

    if (storedSession) {
      setDebugText("Tarayıcı oturumu bulundu.");
      return storedSession;
    }

    setDebugText("Supabase oturumu kontrol ediliyor...");

    const sessionResult = await timeout(
      supabase.auth.getSession(),
      12000,
      "Oturum bilgisi 12 saniye içinde alınamadı."
    ).catch(() => null);

    if (sessionResult?.data?.session?.access_token && sessionResult.data.session.user) {
      setDebugText("Supabase oturumu bulundu.");

      return {
        access_token: sessionResult.data.session.access_token,
        user: {
          id: sessionResult.data.session.user.id,
          email: sessionResult.data.session.user.email || null,
        },
      };
    }

    return null;
  }

  async function loadOrders(showMainLoading = true) {
    if (showMainLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    const hardStop = setTimeout(() => {
      if (!mountedRef.current) return;

      setLoading(false);
      setRefreshing(false);
      setMessage(
        "Dosyalarım yüklenirken işlem uzun sürdü. Lütfen Tekrar Dene butonuna bas."
      );
      setDebugText("15 saniyelik güvenlik süresi doldu.");
    }, 15000);

    try {
      const session = await getCurrentSession();

      if (!mountedRef.current) return;

      if (!session) {
        setUser(null);
        setOrders([]);
        setMessage(
          "Oturum bilgisi alınamadı. Giriş yaptıysan birkaç saniye sonra tekrar dene."
        );
        return;
      }

      setUser(session.user);
      setDebugText("Siparişler yükleniyor...");

      const orderData = await fetchOrdersWithToken(session);

      if (!mountedRef.current) return;

      setOrders(orderData || []);
      setMessage("");
      setDebugText("Dosyalarım başarıyla yüklendi.");
      setLastUpdated(
        new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (error) {
      if (!mountedRef.current) return;

      setMessage(
        error instanceof Error
          ? error.message
          : "Dosyalarım yüklenirken bilinmeyen bir hata oluştu."
      );
      setOrders([]);
      setDebugText("Beklenmeyen hata oluştu.");
    } finally {
      clearTimeout(hardStop);

      if (!mountedRef.current) return;

      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    loadOrders(true);

    return () => {
      mountedRef.current = false;
    };
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Dosyalarım</h1>
              <p className="mt-3 text-gray-400">
                Satın aldığın proje ve kod paketleri burada görünür.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Durum: {debugText || "Hazırlanıyor..."}
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadOrders(false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
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
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{message}</p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => loadOrders(true)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {refreshing ? "Kontrol ediliyor..." : "Tekrar Dene"}
              </button>

              <a
                href="/login"
                className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
              >
                Giriş Yap
              </a>
            </div>
          </div>
        )}

        {loading ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <p>Dosyaların yükleniyor...</p>
            <p className="mt-3 text-sm text-gray-500">
              {debugText || "Oturum ve sipariş kayıtları kontrol ediliyor."}
            </p>
          </section>
        ) : user ? (
          <>
            <section className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-gray-400">Kullanıcı</p>
                <h2 className="mt-3 break-all text-xl font-bold">
                  {user.email}
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
                Satın aldığın ürünler sipariş kayıtlarından gelir.
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
        ) : (
          <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <h2 className="text-3xl font-bold">Oturum alınamadı</h2>
            <p className="mt-4 text-red-200">
              Dosyalarını görmek için giriş yapman gerekiyor.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => loadOrders(true)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {refreshing ? "Kontrol ediliyor..." : "Tekrar Dene"}
              </button>

              <a
                href="/login"
                className="rounded-2xl bg-white px-6 py-3 font-semibold text-black"
              >
                Giriş Yap
              </a>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
