import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type WorkerHeartbeat = {
  worker_id: string;
  status: "idle" | "running" | "error";
  current_job_id: string | null;
  last_seen_at: string;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

export default function AdminSystemHealthPage() {
  const [workers, setWorkers] = useState<WorkerHeartbeat[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadHealth(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const [workersResult, queuedResult, runningResult, failedResult, completedResult] =
        await Promise.all([
          withTimeout(
            supabase
              .from("scanner_worker_heartbeats")
              .select("*")
              .order("last_seen_at", { ascending: false }),
            15000,
            "Worker sağlık kayıtları yüklenemedi."
          ),

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
            .eq("status", "failed"),

          supabase
            .from("security_scan_jobs")
            .select("*", { count: "exact", head: true })
            .eq("status", "completed"),
        ]);

      if (workersResult.error) {
        setMessage("Worker kayıtları yüklenemedi: " + workersResult.error.message);
        setWorkers([]);
      } else {
        setWorkers(workersResult.data || []);
      }

      setQueuedCount(queuedResult.count || 0);
      setRunningCount(runningResult.count || 0);
      setFailedCount(failedResult.count || 0);
      setCompletedCount(completedResult.count || 0);

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
          : "Sistem sağlığı yüklenirken bilinmeyen hata oluştu."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadHealth(true);

    const interval = setInterval(() => {
      loadHealth(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function secondsAgo(date: string) {
    return Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  }

  function workerHealth(worker: WorkerHeartbeat) {
    const diff = secondsAgo(worker.last_seen_at);

    if (diff <= 45) {
      return {
        label: "Aktif",
        className: "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300",
      };
    }

    if (diff <= 120) {
      return {
        label: "Gecikiyor",
        className: "rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300",
      };
    }

    return {
      label: "Pasif / Durmuş olabilir",
      className: "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300",
    };
  }

  function statusClass(status: string) {
    if (status === "running") {
      return "rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300";
    }

    if (status === "error") {
      return "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    return "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Sistem sağlığı yükleniyor...
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
              <h1 className="text-4xl font-bold">Sistem Sağlığı</h1>
              <p className="mt-3 text-gray-400">
                Scanner worker, tarama kuyruğu ve sistem sağlık durumunu takip et.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadHealth(false)}
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

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kuyrukta</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">{queuedCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Taranıyor</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">{runningCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Tamamlandı</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{completedCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Hatalı</p>
            <h2 className="mt-3 text-4xl font-bold text-red-300">{failedCount}</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Scanner Worker Durumu</h2>
          <p className="mt-2 text-sm text-gray-400">
            Worker 45 saniyeden uzun süre sinyal göndermezse gecikiyor görünür.
          </p>

          <div className="mt-6 grid gap-4">
            {workers.map((worker) => {
              const health = workerHealth(worker);

              return (
                <div key={worker.worker_id} className="rounded-3xl bg-black/30 p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-3">
                        <span className={health.className}>{health.label}</span>
                        <span className={statusClass(worker.status)}>
                          {worker.status}
                        </span>
                      </div>

                      <h3 className="mt-4 text-xl font-bold">{worker.worker_id}</h3>

                      <div className="mt-3 grid gap-1 text-sm text-gray-400">
                        <p>Son sinyal: {formatDate(worker.last_seen_at)}</p>
                        <p>{secondsAgo(worker.last_seen_at)} saniye önce</p>
                        <p>Mevcut job: {worker.current_job_id || "Yok"}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:min-w-44">
                      <a
                        href="/admin/scan-jobs"
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Tarama Kuyruğu
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}

            {workers.length === 0 && (
              <div className="rounded-3xl bg-black/30 p-8 text-center text-gray-400">
                Henüz worker heartbeat kaydı yok. Scanner worker çalıştırılınca burada görünecek.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
