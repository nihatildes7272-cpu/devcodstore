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
  retry_count?: number | null;
  max_retries?: number | null;
  last_error?: string | null;
  next_retry_at?: string | null;
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

  async function runJobNow(job: ScanJob) {
    const confirmed = window.confirm("Bu tarama işi bekleme süresi olmadan hemen tekrar denensin mi?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("security_scan_jobs")
      .update({
        status: "queued",
        next_retry_at: null,
        error_message: null,
        worker_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (error) {
      setMessage("Tarama işi hemen kuyruğa alınamadı: " + error.message);
      return;
    }

    await supabase
      .from("products")
      .update({
        strong_scan_status: "queued",
        security_note: "Admin tarafından güçlü tarama hemen tekrar denemeye alındı.",
      })
      .eq("id", job.product_id);

    await loadJobs(page, false);
  }

  async function retryJob(job: ScanJob) {
    const confirmed = window.confirm("Bu tarama işini tekrar kuyruğa almak istiyor musun?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("security_scan_jobs")
      .update({
        status: "queued",
        retry_count: 0,
        last_error: null,
        error_message: null,
        next_retry_at: null,
        result_status: null,
        worker_id: null,
        started_at: null,
        finished_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (error) {
      setMessage("Tarama işi tekrar kuyruğa alınamadı: " + error.message);
      return;
    }

    await supabase
      .from("products")
      .update({
        strong_scan_status: "queued",
        security_note: "Admin tarafından güçlü tarama tekrar kuyruğa alındı.",
      })
      .eq("id", job.product_id);

    await loadJobs(page, false);
  }

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

        <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-transparent p-8 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Güçlü Tarama Kuyruğu</h1>
              <p className="mt-3 text-gray-300">
                ClamAV, Trivy, Semgrep ve sandbox worker için tarama işleri sayfa sayfa takip edilir.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadJobs(page, false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:scale-105 active:scale-95 disabled:opacity-60"
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

        <section className="grid grid-cols-2 gap-4 md:grid-cols-6 md:gap-6">
          {[
            { label: "Toplam", value: totalCount, color: "text-white" },
            { label: "Kuyrukta", value: queuedCount, color: "text-yellow-400" },
            { label: "Taranıyor", value: runningCount, color: "text-blue-400" },
            { label: "Tamamlandı", value: completedCount, color: "text-green-400" },
            { label: "Hatalı", value: failedCount, color: "text-red-400" },
            { label: "İptal", value: cancelledCount, color: "text-gray-400" },
          ].map((stat, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
              <h2 className={`mt-3 text-4xl font-black ${stat.color}`}>
                {stat.value}
              </h2>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
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
                    `rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                      activeStatus === status
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "border border-white/10 text-gray-400 hover:bg-white/5"
                    }`
                  }
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Tarama İşleri</h2>
              <p className="mt-2 text-sm text-gray-400">
                Gösterilen: {visibleRange} / {totalCount} — Sayfa {page} / {totalPages}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Ürün ID, worker, durum veya sonuç ara..."
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white outline-none placeholder:text-gray-600 focus:border-blue-500/50 md:w-96 transition-all"
            />
          </div>

          <div className="mt-10 grid gap-4">
            {jobs.map((job) => {
              const product = getProduct(job);

              return (
                <div key={job.id} className="group rounded-3xl border border-white/5 bg-white/5 p-6 transition hover:bg-white/[0.08]">
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

                      <h3 className="mt-4 text-xl font-black group-hover:text-blue-300 transition-colors">
                        {product?.title || "Ürün bulunamadı"}
                      </h3>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-500">
                        <p>Job ID: {job.id}</p>
                        <p>Ürün ID: {job.product_id}</p>
                        <p>Satıcı: {product?.seller || "Bilinmiyor"}</p>
                        <p>Tarama tipi: {job.scan_type}</p>
                        <p>Öncelik: {job.priority}</p>
                        <p>Worker: {job.worker_id || "Henüz atanmadı"}</p>
                        <p>Skor: {job.score}</p>
                        <p>
                          Retry: {job.retry_count ?? 0}/{job.max_retries ?? 3}
                        </p>
                        <p>Son hata: {job.last_error || "Yok"}</p>
                        <p>Sonraki deneme: {formatDate(job.next_retry_at || null)}</p>
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

                      {job.status === "queued" && (
                        <button
                          onClick={() => runJobNow(job)}
                          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
                        >
                          Hemen Tekrar Dene
                        </button>
                      )}

                      {(job.status === "queued" || job.status === "running") && (
                        <button
                          onClick={() => cancelJob(job)}
                          className="rounded-2xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                        >
                          İptal Et
                        </button>
                      )}

                      {job.status === "failed" && (
                        <button
                          onClick={() => retryJob(job)}
                          className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
                        >
                          Tekrar Kuyruğa Al
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
