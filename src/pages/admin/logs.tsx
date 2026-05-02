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

const pageSize = 25;

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
  { value: "product_security_changed", label: "Ürün Güvenliği" },
  { value: "product_auto_scan", label: "Otomatik Tarama" },
  { value: "strong_product_scan_completed", label: "Güçlü Tarama" },
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

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  async function loadLogs(targetPage = page, showLoading = true) {
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
        .from("admin_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const cleanSearch = search.trim();

      if (cleanSearch) {
        const safeSearch = cleanSearch.replace(/[%_]/g, "");
        const like = `%${safeSearch}%`;

        query = query.or(
          [
            `title.ilike.${like}`,
            `details.ilike.${like}`,
            `action.ilike.${like}`,
            `entity_type.ilike.${like}`,
            `entity_id.ilike.${like}`,
          ].join(",")
        );
      }

      query = query.range(from, to);

      const logsResult = await withTimeout(
        query,
        15000,
        "İşlem kayıtları yüklenirken sunucu geç cevap verdi."
      );

      if (logsResult.error) {
        setMessage("İşlem kayıtları yüklenemedi: " + logsResult.error.message);
        setLogs([]);
        setProfiles([]);
        setTotalCount(0);
        return;
      }

      const logData = logsResult.data || [];
      setLogs(logData);
      setTotalCount(logsResult.count || 0);

      const actorIds = Array.from(
        new Set(logData.map((log) => log.actor_id).filter(Boolean))
      ) as string[];

      if (actorIds.length > 0) {
        const profilesResult = await withTimeout(
          supabase
            .from("profiles")
            .select("id,email,full_name,account_type")
            .in("id", actorIds),
          15000,
          "Admin profilleri yüklenirken sunucu geç cevap verdi."
        );

        if (!profilesResult.error) {
          setProfiles(profilesResult.data || []);
        } else {
          setProfiles([]);
        }
      } else {
        setProfiles([]);
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
          : "İşlem kayıtları yüklenirken bilinmeyen hata oluştu."
      );
      setLogs([]);
      setProfiles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs(page, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [page, search, entityFilter, actionFilter]);

  useEffect(() => {
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
          loadLogs(page, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, search, entityFilter, actionFilter]);

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
    if (action === "product_security_changed") return "Ürün Güvenliği";
    if (action === "product_auto_scan") return "Otomatik Tarama";
    if (action === "strong_product_scan_completed") return "Güçlü Tarama";
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

  function resetFilters() {
    setPage(1);
    setSearch("");
    setEntityFilter("all");
    setActionFilter("all");
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
        Admin işlem kayıtları yükleniyor...
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
              <h1 className="text-4xl font-black tracking-tight">Admin İşlem Kayıtları</h1>
              <p className="mt-3 text-gray-400">
                Admin tarafından yapılan kritik işlemler sayfa sayfa listelenir.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadLogs(page, false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>

              <p className="text-xs text-gray-500">
                {lastUpdated ? `Son güncelleme: ${lastUpdated}` : "Sayfalı log sistemi aktif"}
              </p>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {[
            { label: "Toplam Kayıt", value: totalCount, color: "text-white" },
            { label: "Gösterilen", value: visibleRange, color: "text-blue-400" },
            { label: "Sayfa", value: `${page}/${totalPages}`, color: "text-green-400" },
          ].map((stat, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
              <h2 className={`mt-3 text-4xl font-black ${stat.color}`}>{stat.value}</h2>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="grid gap-4 md:grid-cols-[1fr_240px_240px_auto]">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Başlık, detay, işlem veya kayıt ID ara..."
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white outline-none placeholder:text-gray-600 focus:border-blue-500/50 transition-all"
            />

            <select
              value={entityFilter}
              onChange={(event) => {
                setEntityFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
            >
              {entityFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
            >
              {actionFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            <button
              onClick={resetFilters}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold shadow-lg transition hover:bg-white/10 hover:scale-105 active:scale-95"
            >
              Temizle
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <h2 className="text-2xl font-black tracking-tight">Kayıt Listesi</h2>
          <p className="mt-2 text-sm text-gray-400">
            Gösterilen: {visibleRange} / {totalCount}
          </p>

          <div className="mt-6 grid gap-4">
            {logs.map((log) => (
              <div key={log.id} className="group rounded-3xl border border-white/5 bg-white/5 p-6 transition hover:bg-white/[0.08]">
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

                    <h3 className="mt-4 text-xl font-black group-hover:text-blue-300 transition-colors">{log.title}</h3>

                    {log.details && (
                      <p className="mt-3 leading-7 text-gray-300">{log.details}</p>
                    )}

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-500">
                      <p>👤 {actorName(log.actor_id)}</p>
                      {actorEmail(log.actor_id) && <p>📧 {actorEmail(log.actor_id)}</p>}
                      {log.entity_id && <p>🆔 {log.entity_id}</p>}
                      <p>🕒 {formatDate(log.created_at)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:min-w-44 md:text-right">
                    {log.entity_type === "product" && log.entity_id && (
                      <a
                        href={`/product/${log.entity_id}`}
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-bold text-black transition hover:scale-105 active:scale-95"
                      >
                        Ürünü Aç
                      </a>
                    )}

                    {log.entity_type === "order" && (
                      <a
                        href="/admin/orders"
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-bold text-black transition hover:scale-105 active:scale-95"
                      >
                        Siparişlere Git
                      </a>
                    )}

                    {log.entity_type === "profile" && (
                      <a
                        href="/admin/users"
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-bold text-black transition hover:scale-105 active:scale-95"
                      >
                        Kullanıcılara Git
                      </a>
                    )}

                    {log.entity_type.startsWith("support") && (
                      <a
                        href="/admin/support"
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-bold text-black transition hover:scale-105 active:scale-95"
                      >
                        Desteğe Git
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
                İşlem kaydı bulunamadı.
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
