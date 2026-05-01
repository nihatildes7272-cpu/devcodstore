import { useEffect, useMemo, useState } from "react";
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

type RunningJob = {
  id: string;
  product_id: string;
  worker_id: string | null;
  started_at: string | null;
  created_at: string;
  status: string;
};

type SystemAlert = {
  level: "critical" | "warning" | "info";
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
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
  const [runningJobs, setRunningJobs] = useState<RunningJob[]>([]);

  const [queuedCount, setQueuedCount] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);

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
      const [
        workersResult,
        runningJobsResult,
        queuedResult,
        runningResult,
        failedResult,
        completedResult,
        cancelledResult,
      ] = await Promise.all([
        withTimeout(
          supabase
            .from("scanner_worker_heartbeats")
            .select("*")
            .order("last_seen_at", { ascending: false }),
          15000,
          "Worker sağlık kayıtları yüklenemedi."
        ),

        withTimeout(
          supabase
            .from("security_scan_jobs")
            .select("id,product_id,worker_id,started_at,created_at,status")
            .eq("status", "running")
            .order("started_at", { ascending: true })
            .limit(20),
          15000,
          "Running job kayıtları yüklenemedi."
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

        supabase
          .from("security_scan_jobs")
          .select("*", { count: "exact", head: true })
          .eq("status", "cancelled"),
      ]);

      if (workersResult.error) {
        setMessage("Worker kayıtları yüklenemedi: " + workersResult.error.message);
        setWorkers([]);
      } else {
        setWorkers(workersResult.data || []);
      }

      if (runningJobsResult.error) {
        setRunningJobs([]);
      } else {
        setRunningJobs(runningJobsResult.data || []);
      }

      setQueuedCount(queuedResult.count || 0);
      setRunningCount(runningResult.count || 0);
      setFailedCount(failedResult.count || 0);
      setCompletedCount(completedResult.count || 0);
      setCancelledCount(cancelledResult.count || 0);

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

  function formatDate(date: string | null) {
    if (!date) return "Yok";

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

  function minutesAgo(date: string | null) {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
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

  function alertClass(level: string) {
    if (level === "critical") {
      return "rounded-3xl border border-red-500/30 bg-red-500/10 p-5";
    }

    if (level === "warning") {
      return "rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-5";
    }

    return "rounded-3xl border border-blue-500/30 bg-blue-500/10 p-5";
  }

  function alertBadgeClass(level: string) {
    if (level === "critical") {
      return "rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white";
    }

    if (level === "warning") {
      return "rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300";
    }

    return "rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300";
  }

  const staleWorkers = useMemo(() => {
    return workers.filter((worker) => secondsAgo(worker.last_seen_at) > 120);
  }, [workers]);

  const delayedWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const diff = secondsAgo(worker.last_seen_at);
      return diff > 45 && diff <= 120;
    });
  }, [workers]);

  const longRunningJobs = useMemo(() => {
    return runningJobs.filter((job) => minutesAgo(job.started_at) >= 30);
  }, [runningJobs]);

  const alerts = useMemo<SystemAlert[]>(() => {
    const list: SystemAlert[] = [];

    if (workers.length === 0) {
      list.push({
        level: "critical",
        title: "Hiç worker heartbeat kaydı yok",
        description:
          "Scanner worker çalışmıyor olabilir. Railway worker loglarını kontrol et.",
        actionHref: "/admin/scan-jobs",
        actionLabel: "Tarama Kuyruğu",
      });
    }

    if (staleWorkers.length > 0) {
      list.push({
        level: "critical",
        title: "Worker pasif görünüyor",
        description: `${staleWorkers.length} worker 2 dakikadan uzun süredir sinyal göndermedi.`,
        actionHref: "/admin/scan-jobs",
        actionLabel: "Kuyruğu Aç",
      });
    }

    if (delayedWorkers.length > 0) {
      list.push({
        level: "warning",
        title: "Worker sinyali gecikiyor",
        description: `${delayedWorkers.length} worker 45 saniyeden uzun süredir heartbeat göndermedi.`,
        actionHref: "/admin/system-health",
        actionLabel: "Yenile",
      });
    }

    if (queuedCount >= 50) {
      list.push({
        level: "warning",
        title: "Tarama kuyruğu birikiyor",
        description: `Kuyrukta ${queuedCount} tarama işi var. Worker sayısını artırmak gerekebilir.`,
        actionHref: "/admin/scan-jobs",
        actionLabel: "Kuyruğu Aç",
      });
    }

    if (queuedCount >= 200) {
      list.push({
        level: "critical",
        title: "Tarama kuyruğu kritik seviyede",
        description: `Kuyrukta ${queuedCount} iş var. Worker ölçekleme veya hata kontrolü gerekli.`,
        actionHref: "/admin/scan-jobs",
        actionLabel: "Acil Kontrol",
      });
    }

    if (longRunningJobs.length > 0) {
      list.push({
        level: "warning",
        title: "Uzun süredir çalışan tarama işleri var",
        description: `${longRunningJobs.length} job 30 dakikadan uzun süredir running durumda.`,
        actionHref: "/admin/scan-jobs",
        actionLabel: "Jobları İncele",
      });
    }

    if (failedCount >= 10) {
      list.push({
        level: "warning",
        title: "Hatalı tarama işi sayısı arttı",
        description: `${failedCount} failed job var. Worker logları ve dosya hataları kontrol edilmeli.`,
        actionHref: "/admin/scan-jobs",
        actionLabel: "Failed Jobları Aç",
      });
    }

    if (failedCount >= 50) {
      list.push({
        level: "critical",
        title: "Hatalı tarama işleri kritik seviyede",
        description: `${failedCount} failed job var. Tarama sistemi veya storage bağlantısı sorunlu olabilir.`,
        actionHref: "/admin/scan-jobs",
        actionLabel: "Acil Kontrol",
      });
    }

    if (list.length === 0) {
      list.push({
        level: "info",
        title: "Kritik alarm yok",
        description: "Worker ve tarama kuyruğu şu an sağlıklı görünüyor.",
      });
    }

    return list;
  }, [workers, staleWorkers, delayedWorkers, queuedCount, longRunningJobs, failedCount]);

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
                Scanner worker, tarama kuyruğu ve kritik sistem alarmlarını takip et.
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

        <section className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Sistem Alarmları</h2>
          <p className="mt-2 text-sm text-gray-400">
            Worker gecikmesi, kuyruk birikmesi ve hatalı job sayıları burada uyarı olarak görünür.
          </p>

          <div className="mt-6 grid gap-4">
            {alerts.map((alert, index) => (
              <div key={`${alert.title}-${index}`} className={alertClass(alert.level)}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className={alertBadgeClass(alert.level)}>
                      {alert.level === "critical"
                        ? "KRİTİK"
                        : alert.level === "warning"
                        ? "UYARI"
                        : "BİLGİ"}
                    </span>

                    <h3 className="mt-4 text-xl font-bold">{alert.title}</h3>
                    <p className="mt-2 leading-7 text-gray-300">
                      {alert.description}
                    </p>
                  </div>

                  {alert.actionHref && (
                    <a
                      href={alert.actionHref}
                      className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-black"
                    >
                      {alert.actionLabel || "Aç"}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-5">
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

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">İptal</p>
            <h2 className="mt-3 text-4xl font-bold text-gray-300">{cancelledCount}</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Scanner Worker Durumu</h2>
          <p className="mt-2 text-sm text-gray-400">
            Worker 45 saniyeden uzun süre sinyal göndermezse gecikiyor, 120 saniyeden uzun süre göndermezse pasif görünür.
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
                        <p>Hostname: {String(worker.meta?.hostname || "Bilinmiyor")}</p>
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

        {runningJobs.length > 0 && (
          <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Running Job Kontrolü</h2>
            <p className="mt-2 text-sm text-gray-400">
              Şu anda çalışan tarama işlerinden ilk 20 kayıt.
            </p>

            <div className="mt-6 grid gap-4">
              {runningJobs.map((job) => (
                <div key={job.id} className="rounded-3xl bg-black/30 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-bold">Job: {job.id}</h3>
                      <p className="mt-2 text-sm text-gray-400">
                        Ürün: {job.product_id}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Worker: {job.worker_id || "Atanmadı"}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Başlama: {formatDate(job.started_at)}
                      </p>
                    </div>

                    <div
                      className={
                        minutesAgo(job.started_at) >= 30
                          ? "rounded-2xl bg-yellow-500/20 px-4 py-3 text-sm font-semibold text-yellow-300"
                          : "rounded-2xl bg-blue-500/20 px-4 py-3 text-sm font-semibold text-blue-300"
                      }
                    >
                      {minutesAgo(job.started_at)} dakika
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
