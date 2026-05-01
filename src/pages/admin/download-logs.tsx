import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type DownloadLog = {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string | null;
  file_path: string;
  file_name: string | null;
  user_agent: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type Product = {
  id: string;
  title: string;
  seller: string;
};

const pageSize = 30;

export default function AdminDownloadLogsPage() {
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  async function loadLogs(targetPage = page, showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    const from = (targetPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("product_download_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search.trim()) {
      const safeSearch = search.trim().replace(/[%_]/g, "");
      const like = `%${safeSearch}%`;

      query = query.or(
        [
          `product_id.ilike.${like}`,
          `file_name.ilike.${like}`,
          `file_path.ilike.${like}`,
          `user_agent.ilike.${like}`,
        ].join(",")
      );
    }

    const { data, error, count } = await query;

    if (error) {
      setMessage("İndirme geçmişi yüklenemedi: " + error.message);
      setLogs([]);
      setTotalCount(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const logData = data || [];
    setLogs(logData);
    setTotalCount(count || 0);

    const userIds = Array.from(new Set(logData.map((item) => item.user_id)));
    const productIds = Array.from(new Set(logData.map((item) => item.product_id)));

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,email,full_name")
        .in("id", userIds);

      setProfiles(profileData || []);
    } else {
      setProfiles([]);
    }

    if (productIds.length > 0) {
      const { data: productData } = await supabase
        .from("products")
        .select("id,title,seller")
        .in("id", productIds);

      setProducts(productData || []);
    } else {
      setProducts([]);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs(page, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [page, search]);

  function profileFor(userId: string) {
    return profiles.find((profile) => profile.id === userId);
  }

  function productFor(productId: string) {
    return products.find((product) => product.id === productId);
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

  const visibleRange = useMemo(() => {
    if (totalCount === 0) return "0";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalCount);
    return `${start}-${end}`;
  }, [page, totalCount]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        İndirme geçmişi yükleniyor...
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
              <h1 className="text-4xl font-bold">İndirme Geçmişi</h1>
              <p className="mt-3 text-gray-400">
                Kullanıcıların satın aldığı ürün dosyalarını ne zaman indirdiğini takip et.
              </p>
            </div>

            <button
              onClick={() => loadLogs(page, false)}
              disabled={refreshing}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {refreshing ? "Yenileniyor..." : "Yenile"}
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Kayıt</p>
            <h2 className="mt-3 text-4xl font-bold">{totalCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Gösterilen</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">{visibleRange}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Sayfa</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">
              {page}/{totalPages}
            </h2>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Kayıtlar</h2>
              <p className="mt-2 text-sm text-gray-400">
                Sayfa başına {pageSize} indirme kaydı gösterilir.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Ürün ID, dosya adı veya cihaz bilgisi ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500 md:w-96"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {logs.map((log) => {
              const profile = profileFor(log.user_id);
              const product = productFor(log.product_id);

              return (
                <div key={log.id} className="rounded-3xl bg-black/30 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-xl font-bold">
                        {product?.title || log.product_id}
                      </h3>

                      <div className="mt-3 grid gap-1 text-sm text-gray-400">
                        <p>Kullanıcı: {profile?.full_name || "Kullanıcı"}</p>
                        <p>E-posta: {profile?.email || "E-posta yok"}</p>
                        <p>Satıcı: {product?.seller || "Bilinmiyor"}</p>
                        <p>Dosya: {log.file_name || log.file_path}</p>
                        <p>Tarih: {formatDate(log.created_at)}</p>
                        <p className="break-all">Ürün ID: {log.product_id}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:min-w-44">
                      <a
                        href={`/product/${log.product_id}`}
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Ürünü Aç
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}

            {logs.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
                İndirme kaydı bulunamadı.
              </div>
            )}
          </div>

          {totalCount > pageSize && (
            <section className="mt-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/30 p-5 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-400">
                Sayfa {page} / {totalPages}
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
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
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
