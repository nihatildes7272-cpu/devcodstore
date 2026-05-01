import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type RateLimitRow = {
  id: string;
  rate_key: string;
  action: string;
  window_start: string;
  count: number;
  created_at: string;
  updated_at: string;
};

const pageSize = 40;

export default function AdminRateLimitsPage() {
  const [rows, setRows] = useState<RateLimitRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  async function loadRows(targetPage = page) {
    setLoading(true);
    setMessage("");

    const from = (targetPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("api_rate_limits")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (actionFilter !== "all") {
      query = query.eq("action", actionFilter);
    }

    if (search.trim()) {
      const safeSearch = search.trim().replace(/[%_]/g, "");
      const like = `%${safeSearch}%`;

      query = query.or(
        [
          `rate_key.ilike.${like}`,
          `action.ilike.${like}`,
        ].join(",")
      );
    }

    const { data, error, count } = await query;

    if (error) {
      setMessage("Rate limit kayıtları yüklenemedi: " + error.message);
      setRows([]);
      setTotalCount(0);
    } else {
      setRows(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRows(page);
    }, 300);

    return () => clearTimeout(timer);
  }, [page, search, actionFilter]);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Rate limit kayıtları yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">API Rate Limit Kayıtları</h1>
          <p className="mt-3 text-gray-400">
            İndirme ve tarama API isteklerinin limit kayıtlarını takip et.
          </p>
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
            <p className="text-sm text-gray-400">Sayfa</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">
              {page}/{totalPages}
            </h2>
          </div>

          <button
            onClick={() => loadRows(page)}
            className="rounded-3xl border border-blue-500/30 bg-blue-500/10 p-6 text-left font-semibold text-blue-300 hover:bg-blue-500/20"
          >
            Yenile
          </button>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Kullanıcı, IP veya action ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500"
            />

            <select
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none"
            >
              <option value="all">Tüm Actionlar</option>
              <option value="download_create_link">Download API</option>
              <option value="auto_security_scan">Otomatik Tarama API</option>
            </select>
          </div>

          <div className="mt-6 grid gap-4">
            {rows.map((row) => (
              <div key={row.id} className="rounded-3xl bg-black/30 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{row.action}</h2>

                    <div className="mt-3 grid gap-1 text-sm text-gray-400">
                      <p>Key: {row.rate_key}</p>
                      <p>Pencere başlangıcı: {formatDate(row.window_start)}</p>
                      <p>Son güncelleme: {formatDate(row.updated_at)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-blue-500/10 px-5 py-3 text-center">
                    <p className="text-sm text-gray-400">İstek</p>
                    <p className="text-3xl font-bold text-blue-300">{row.count}</p>
                  </div>
                </div>
              </div>
            ))}

            {rows.length === 0 && (
              <div className="rounded-3xl bg-black/30 p-8 text-center text-gray-400">
                Rate limit kaydı bulunamadı.
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
