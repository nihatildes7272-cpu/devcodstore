import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type MaintenanceRun = {
  id: string;
  actor_id: string | null;
  action: string;
  summary: Record<string, unknown>;
  created_at: string;
};

export default function AdminMaintenancePage() {
  const [runs, setRuns] = useState<MaintenanceRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  async function loadRuns() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("system_maintenance_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      setMessage("Bakım geçmişi yüklenemedi: " + error.message);
      setRuns([]);
    } else {
      setRuns(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function runCleanup() {
    const confirmed = window.confirm(
      "Sistem temizliği çalıştırılsın mı? Eski log ve geçici kayıtlar temizlenecek."
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage("");
    setLastResult(null);

    const { data, error } = await supabase.rpc("run_system_cleanup");

    if (error) {
      setMessage("Sistem temizliği başarısız: " + error.message);
      setRunning(false);
      return;
    }

    setLastResult(data || {});
    setMessage("Sistem temizliği tamamlandı.");
    setRunning(false);
    await loadRuns();
  }

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

  function valueOf(summary: Record<string, unknown>, key: string) {
    const value = summary?.[key];

    if (typeof value === "number") return value;
    if (typeof value === "string") return value;

    return 0;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Sistem bakım kayıtları yükleniyor...
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
              <h1 className="text-4xl font-bold">Sistem Bakımı</h1>
              <p className="mt-3 text-gray-400">
                Eski geçici kayıtları, rate limit kayıtlarını, okunmuş bildirimleri ve eski tarama kayıtlarını temizle.
              </p>
            </div>

            <button
              onClick={runCleanup}
              disabled={running}
              className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {running ? "Temizlik çalışıyor..." : "Sistem Temizliği Çalıştır"}
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            {message}
          </div>
        )}

        {lastResult && (
          <section className="mb-8 rounded-3xl border border-green-500/20 bg-green-500/10 p-6">
            <h2 className="text-2xl font-bold">Son Temizlik Sonucu</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Rate Limit</p>
                <p className="mt-2 text-3xl font-bold">
                  {valueOf(lastResult, "deleted_rate_limits")}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Okunmuş Bildirim</p>
                <p className="mt-2 text-3xl font-bold">
                  {valueOf(lastResult, "deleted_read_notifications")}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">İndirme Logu</p>
                <p className="mt-2 text-3xl font-bold">
                  {valueOf(lastResult, "deleted_download_logs")}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Tarama Job</p>
                <p className="mt-2 text-3xl font-bold">
                  {valueOf(lastResult, "deleted_scan_jobs")}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Worker Heartbeat</p>
                <p className="mt-2 text-3xl font-bold">
                  {valueOf(lastResult, "deleted_heartbeats")}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Admin Log</p>
                <p className="mt-2 text-3xl font-bold">
                  {valueOf(lastResult, "deleted_old_admin_logs")}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Bakım Geçmişi</h2>
              <p className="mt-2 text-sm text-gray-400">
                Son 30 sistem bakım çalıştırması.
              </p>
            </div>

            <button
              onClick={loadRuns}
              className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10"
            >
              Yenile
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {runs.map((run) => (
              <div key={run.id} className="rounded-3xl bg-black/30 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{run.action}</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      Tarih: {formatDate(run.created_at)}
                    </p>
                    <p className="mt-1 break-all text-sm text-gray-500">
                      Run ID: {run.id}
                    </p>
                  </div>

                  <div className="grid gap-1 text-sm text-gray-300 md:text-right">
                    <p>Rate Limit: {valueOf(run.summary, "deleted_rate_limits")}</p>
                    <p>Bildirim: {valueOf(run.summary, "deleted_read_notifications")}</p>
                    <p>İndirme: {valueOf(run.summary, "deleted_download_logs")}</p>
                    <p>Scan Job: {valueOf(run.summary, "deleted_scan_jobs")}</p>
                    <p>Heartbeat: {valueOf(run.summary, "deleted_heartbeats")}</p>
                    <p>Admin Log: {valueOf(run.summary, "deleted_old_admin_logs")}</p>
                  </div>
                </div>
              </div>
            ))}

            {runs.length === 0 && (
              <div className="rounded-3xl bg-black/30 p-8 text-center text-gray-400">
                Henüz sistem bakımı çalıştırılmamış.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
