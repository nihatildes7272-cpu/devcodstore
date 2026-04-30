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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadJobs(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const [jobsResult, productsResult] = await Promise.all([
        withTimeout(
          supabase
            .from("security_scan_jobs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(300),
          15000,
          "Tarama işleri yüklenirken sunucu geç cevap verdi."
        ),
        withTimeout(
          supabase
            .from("products")
            .select("id,title,seller,security_status,strong_scan_status"),
          15000,
          "Ürün bilgileri yüklenirken sunucu geç cevap verdi."
        ),
      ]);

      if (jobsResult.error) {
        setMessage("Tarama işleri yüklenemedi: " + jobsResult.error.message);
        setJobs([]);
      } else {
        setJobs(jobsResult.data || []);
      }

      if (!productsResult.error) {
        setProducts(productsResult.data || []);
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
          : "Tarama kuyruğu yüklenirken bilinmeyen hata oluştu."
      );
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadJobs(true);

    const channel = supabase
      .channel("security-scan-jobs-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "security_scan_jobs",
        },
        () => loadJobs(false)
      )
      .subscribe();

    const interval = setInterval(() => {
      loadJobs(false);
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

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

    await loadJobs(false);
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

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const product = getProduct(job);

      const matchesStatus =
        activeStatus === "all" || job.status === activeStatus;

      const text = `${job.id} ${job.product_id} ${job.status} ${
        job.result_status || ""
      } ${product?.title || ""} ${product?.seller || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [jobs, products, activeStatus, search]);

  const queuedCount = jobs.filter((job) => job.status === "queued").length;
  const runningCount = jobs.filter((job) => job.status === "running").length;
  const completedCount = jobs.filter((job) => job.status === "completed").length;
  const failedCount = jobs.filter((job) => job.status === "failed").length;

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
                ClamAV, Trivy, Semgrep ve sandbox worker için tarama işleri burada takip edilir.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadJobs(false)}
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

        <section className="grid gap-6 md:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam İş</p>
            <h2 className="mt-3 text-4xl font-bold">{jobs.length}</h2>
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

              return (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className={
                    activeStatus === status
                      ? "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                      : "rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
                  }
                >
                  {label}
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
                Gösterilen iş sayısı: {filteredJobs.length}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ürün, satıcı, durum veya job ID ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500 md:w-96"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {filteredJobs.map((job) => {
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

            {filteredJobs.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
                Tarama işi bulunamadı. Admin ürün yönetiminde “Güçlü Tara” butonuna basınca burada görünecek.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
