import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type AdminLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  details: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: string | null;
};

const entityFilters = [
  { value: "all", label: "Tümü" },
  { value: "product", label: "Ürün" },
  { value: "order", label: "Sipariş" },
  { value: "profile", label: "Kullanıcı" },
  { value: "review", label: "Yorum" },
  { value: "support_ticket", label: "Destek Talebi" },
  { value: "support_message", label: "Destek Mesajı" },
];

const actionFilters = [
  { value: "all", label: "Tüm İşlemler" },
  { value: "product_status_changed", label: "Ürün Durumu" },
  { value: "order_status_changed", label: "Sipariş Durumu" },
  { value: "profile_role_changed", label: "Rol Değişimi" },
  { value: "review_deleted", label: "Yorum Silme" },
  { value: "support_status_changed", label: "Destek Durumu" },
  { value: "support_admin_reply", label: "Destek Yanıtı" },
];

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

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadLogs(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const [logsResult, profilesResult] = await Promise.all([
        withTimeout(
          supabase
            .from("admin_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(300),
          15000,
          "İşlem kayıtları yüklenirken sunucu geç cevap verdi."
        ),
        withTimeout(
          supabase
            .from("profiles")
            .select("id,email,full_name,account_type"),
          15000,
          "Kullanıcı bilgileri yüklenirken sunucu geç cevap verdi."
        ),
      ]);

      if (logsResult.error) {
        setMessage("İşlem kayıtları yüklenemedi: " + logsResult.error.message);
        setLogs([]);
      } else {
        setLogs(logsResult.data || []);
      }

      if (!profilesResult.error) {
        setProfiles(profilesResult.data || []);
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
          : "İşlem kayıtları yüklenirken bilinmeyen bir hata oluştu."
      );
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadLogs(true);

    const channel = supabase
      .channel("admin-logs-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_logs",
        },
        () => {
          loadLogs(false);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      loadLogs(false);
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  function actorName(actorId: string | null) {
    if (!actorId) return "Sistem / Bilinmeyen";

    const profile = profiles.find((item) => item.id === actorId);

    if (!profile) return "Bilinmeyen Admin";

    return profile.full_name || profile.email || "Admin";
  }

  function actorEmail(actorId: string | null) {
    if (!actorId) return "";

    const profile = profiles.find((item) => item.id === actorId);

    return profile?.email || "";
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

  function actionLabel(action: string) {
    if (action === "product_status_changed") return "Ürün Durumu";
    if (action === "order_status_changed") return "Sipariş Durumu";
    if (action === "profile_role_changed") return "Rol Değişimi";
    if (action === "review_deleted") return "Yorum Silindi";
    if (action === "support_status_changed") return "Destek Durumu";
    if (action === "support_admin_reply") return "Destek Yanıtı";
    return action;
  }

  function entityLabel(entityType: string) {
    if (entityType === "product") return "Ürün";
    if (entityType === "order") return "Sipariş";
    if (entityType === "profile") return "Kullanıcı";
    if (entityType === "review") return "Yorum";
    if (entityType === "support_ticket") return "Destek Talebi";
    if (entityType === "support_message") return "Destek Mesajı";
    return entityType;
  }

  function entityClass(entityType: string) {
    if (entityType === "product") {
      return "rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300";
    }

    if (entityType === "order") {
      return "rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300";
    }

    if (entityType === "profile") {
      return "rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-300";
    }

    if (entityType === "review") {
      return "rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-300";
    }

    return "rounded-full bg-gray-500/20 px-3 py-1 text-sm text-gray-300";
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesEntity =
        entityFilter === "all" || log.entity_type === entityFilter;

      const matchesAction =
        actionFilter === "all" || log.action === actionFilter;

      const text = `${log.title} ${log.details || ""} ${log.action} ${
        log.entity_type
      } ${actorName(log.actor_id)} ${actorEmail(log.actor_id)}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      return matchesEntity && matchesAction && matchesSearch;
    });
  }, [logs, profiles, search, entityFilter, actionFilter]);

  const productLogCount = logs.filter((log) => log.entity_type === "product").length;
  const orderLogCount = logs.filter((log) => log.entity_type === "order").length;
  const profileLogCount = logs.filter((log) => log.entity_type === "profile").length;
  const supportLogCount = logs.filter((log) =>
    log.entity_type.startsWith("support")
  ).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Admin işlem kayıtları yükleniyor...
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
              <h1 className="text-4xl font-bold">Admin İşlem Kayıtları</h1>
              <p className="mt-3 text-gray-400">
                Admin tarafından yapılan kritik işlemler burada kayıt altına alınır.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadLogs(false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>

              <p className="text-xs text-gray-500">
                {lastUpdated ? `Son güncelleme: ${lastUpdated}` : "Canlı takip aktif"}
              </p>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{message}</p>

            <button
              onClick={() => loadLogs(false)}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Kayıt</p>
            <h2 className="mt-3 text-4xl font-bold">{logs.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Ürün</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">
              {productLogCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Sipariş</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">
              {orderLogCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kullanıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-purple-300">
              {profileLogCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Destek</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">
              {supportLogCount}
            </h2>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_240px_240px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Başlık, detay, admin, işlem ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500"
            />

            <select
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none"
            >
              {entityFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none"
            >
              {actionFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Kayıt Listesi</h2>
              <p className="mt-2 text-sm text-gray-400">
                Gösterilen kayıt sayısı: {filteredLogs.length}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="rounded-3xl bg-black/30 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-3">
                      <span className={entityClass(log.entity_type)}>
                        {entityLabel(log.entity_type)}
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300">
                        {actionLabel(log.action)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold">{log.title}</h3>

                    {log.details && (
                      <p className="mt-3 leading-7 text-gray-300">{log.details}</p>
                    )}

                    <div className="mt-4 grid gap-1 text-sm text-gray-500">
                      <p>Admin: {actorName(log.actor_id)}</p>
                      {actorEmail(log.actor_id) && <p>E-posta: {actorEmail(log.actor_id)}</p>}
                      {log.entity_id && <p>Kayıt ID: {log.entity_id}</p>}
                      <p>Tarih: {formatDate(log.created_at)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:min-w-44 md:text-right">
                    {log.entity_type === "product" && log.entity_id && (
                      <a
                        href={`/product/${log.entity_id}`}
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Ürünü Aç
                      </a>
                    )}

                    {log.entity_type === "order" && (
                      <a
                        href="/admin/orders"
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Siparişlere Git
                      </a>
                    )}

                    {log.entity_type === "profile" && (
                      <a
                        href="/admin/users"
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Kullanıcılara Git
                      </a>
                    )}

                    {log.entity_type.startsWith("support") && (
                      <a
                        href="/admin/support"
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Desteğe Git
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
                İşlem kaydı bulunamadı. Yeni admin işlemleri yaptıkça burada görünecek.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
