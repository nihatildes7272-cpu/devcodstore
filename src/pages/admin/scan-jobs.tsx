import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type ScanJob = {
  id: string;
  product_id: string;
  requested_by: string | null;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  scan_type: string;
  priority: number;
  worker_id: string | null;
  result_status: string | null;
  score: number;
  report: Record<string, unknown>;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

type Product = {
  id: string;
  title: string;
  seller: string;
  security_status: string | null;
  strong_scan_status: string | null;
};

const pageSize = 20;
const statusTabs = ["all", "queued", "running", "completed", "failed", "cancelled"] as const;

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

export default function AdminScanJobsPage() {
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [activeStatus, setActiveStatus] =
    useState<(typeof statusTabs)[number]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [totalCount, setTotalCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  async function loadCounts() {
    const [queued, running, completed, failed, cancelled, all] = await Promise.all([
      supabase
        .from("security_scan_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "queued"),

      supabase
        .from("security_scan_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "running"),

      supabase
        .from("security_scan_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),

      supabase
        .from("security_scan_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed"),

      supabase
        .from("security_scan_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelled"),

      supabase
        .from("security_scan_jobs")
        .select("*", { count: "exact", head: true }),
    ]);

    setQueuedCount(queued.count || 0);
    setRunningCount(running.count || 0);
    setCompletedCount(completed.count || 0);
    setFailedCount(failed.count || 0);
    setCancelledCount(cancelled.count || 0);

    if (activeStatus === "all" && !search.trim()) {
      setTotalCount(all.count || 0);
    }
  }

  async function loadJobs(targetPage = page, showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const from = (targetPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("security_scan_jobs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (activeStatus !== "all") {
        query = query.eq("status", activeStatus);
      }

      const cleanSearch = search.trim();

      if (cleanSearch) {
        const safeSearch = cleanSearch.replace(/[%_]/g, "");
        const like = `%${safeSearch}%`;

        query = query.or(
          [
            `product_id.ilike.${like}`,
            `status.ilike.${like}`,
            `scan_type.ilike.${like}`,
            `worker_id.ilike.${like}`,
            `result_status.ilike.${like}`,
            `error_message.ilike.${like}`,
          ].join(",")
        );
      }

      query = query.range(from, to);

      const jobsResult = await withTimeout(
        query,
        15000,
        "Tarama işleri yüklenirken sunucu geç cevap verdi."
      );

      if (jobsResult.error) {
        setMessage("Tarama işleri yüklenemedi: " + jobsResult.error.message);
        setJobs([]);
        setProducts([]);
        setTotalCount(0);
        return;
      }

      const jobData = jobsResult.data || [];
      setJobs(jobData);
      setTotalCount(jobsResult.count || 0);

      const productIds = Array.from(new Set(jobData.map((job) => job.product_id)));

      if (productIds.length > 0) {
        const productsResult = await withTimeout(
          supabase
            .from("products")
            .select("id,title,seller,security_status,strong_scan_status")
            .in("id", productIds),
          15000,
          "Ürün bilgileri yüklenirken sunucu geç cevap verdi."
        );

        if (!productsResult.error) {
          setProducts(productsResult.data || []);
        } else {
          setProducts([]);
        }
      } else {
        setProducts([]);
      }

      await loadCounts();

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
          : "Tarama kuyruğu yüklenirken bilinmeyen hata oluştu."
      );
      setJobs([]);
      setProducts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadJobs(page, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [page, activeStatus, search]);

  useEffect(() => {
    const channel = supabase
      .channel("security-scan-jobs-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "security_scan_jobs",
        },
        () => loadJobs(page, false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, activeStatus, search]);

  async function cancelJob(job: ScanJob) {
    const confirmed = window.confirm("Bu tarama işini iptal etmek istiyor musun?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("security_scan_jobs")
      .update({
        status: "cancelled",
        error_message: "Admin tarafından iptal edildi.",
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (error) {
      setMessage("Tarama işi iptal edilemedi: " + error.message);
      return;
    }

    await supabase
      .from("products")
      .update({
        strong_scan_status: "cancelled",
      })
      .eq("id", job.product_id);

    await loadJobs(page, false);
  }

  function getProduct(job: ScanJob) {
    return products.find((product) => product.id === job.product_id);
  }

  function statusClass(status: string) {
    if (status === "completed") {
      return "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "failed") {
      return "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    if (status === "running") {
      return "rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300";
    }

    if (status === "cancelled") {
      return "rounded-full bg-gray-500/20 px-4 py-2 text-sm text-gray-300";
    }

    return "rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
  }

  function resultClass(result: string | null) {
    if (result === "Güvenli") {
      return "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (result === "Riskli") {
      return "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    if (result === "Manuel İnceleme") {
      return "rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300";
    }

    if (result === "Tarama Hatası") {
      return "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    return "rounded-full bg-gray-500/20 px-4 py-2 text-sm text-gray-300";
  }

  function formatDate(date: string | null) {
    if (!date) return "Yok";

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function changeTab(status: (typeof statusTabs)[number]) {
    setActiveStatus(status);
    setPage(1);
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
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
        Güçlü tarama kuyruğu yükleniyor...
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
              <h1 className="text-4xl font-bold">Güçlü Tarama Kuyruğu</h1>
              <p className="mt-3 text-gray-400">
                ClamAV, Trivy, Semgrep ve sandbox worker için tarama işleri sayfa sayfa takip edilir.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadJobs(page, false)}
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
            {message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam</p>
            <h2 className="mt-3 text-4xl font-bold">{totalCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kuyrukta</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">
              {queuedCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Taranıyor</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">
              {runningCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Tamamlandı</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">
              {completedCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Hatalı</p>
            <h2 className="mt-3 text-4xl font-bold text-red-300">
              {failedCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">İptal</p>
            <h2 className="mt-3 text-4xl font-bold text-gray-300">
              {cancelledCount}
            </h2>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid gap-3 md:grid-cols-6">
            {statusTabs.map((status) => {
              const label =
                status === "all"
                  ? "Tümü"
                  : status === "queued"
                  ? "Kuyrukta"
                  : status === "running"
                  ? "Taranıyor"
                  : status === "completed"
                  ? "Tamamlandı"
                  : status === "failed"
                  ? "Hatalı"
                  : "İptal";

              const count =
                status === "all"
                  ? totalCount
                  : status === "queued"
                  ? queuedCount
                  : status === "running"
                  ? runningCount
                  : status === "completed"
                  ? completedCount
                  : status === "failed"
                  ? failedCount
                  : cancelledCount;

              return (
                <button
                  key={status}
                  onClick={() => changeTab(status)}
                  className={
                    activeStatus === status
                      ? "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                      : "rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
                  }
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Tarama İşleri</h2>
              <p className="mt-2 text-sm text-gray-400">
                Gösterilen: {visibleRange} / {totalCount} — Sayfa {page} / {totalPages}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Ürün ID, worker, durum veya sonuç ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500 md:w-96"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {jobs.map((job) => {
              const product = getProduct(job);

              return (
                <div key={job.id} className="rounded-3xl bg-black/30 p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-3">
                        <span className={statusClass(job.status)}>
                          {job.status}
                        </span>

                        <span className={resultClass(job.result_status)}>
                          {job.result_status || "Sonuç yok"}
                        </span>
                      </div>

                      <h3 className="mt-4 text-xl font-bold">
                        {product?.title || "Ürün bulunamadı"}
                      </h3>

                      <div className="mt-3 grid gap-1 text-sm text-gray-400">
                        <p>Job ID: {job.id}</p>
                        <p>Ürün ID: {job.product_id}</p>
                        <p>Satıcı: {product?.seller || "Bilinmiyor"}</p>
                        <p>Tarama tipi: {job.scan_type}</p>
                        <p>Öncelik: {job.priority}</p>
                        <p>Worker: {job.worker_id || "Henüz atanmadı"}</p>
                        <p>Skor: {job.score}</p>
                        <p>Oluşturulma: {formatDate(job.created_at)}</p>
                        <p>Başlama: {formatDate(job.started_at)}</p>
                        <p>Bitiş: {formatDate(job.finished_at)}</p>
                      </div>

                      {job.error_message && (
                        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                          {job.error_message}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 lg:min-w-48">
                      <a
                        href={`/product/${job.product_id}`}
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Ürünü Aç
                      </a>

                      <a
                        href="/admin/products"
                        className="rounded-2xl border border-white/15 px-4 py-2 text-center text-sm font-semibold hover:bg-white/10"
                      >
                        Ürün Yönetimi
                      </a>

                      {(job.status === "queued" || job.status === "running") && (
                        <button
                          onClick={() => cancelJob(job)}
                          className="rounded-2xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                        >
                          İptal Et
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {jobs.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
                Tarama işi bulunamadı.
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
