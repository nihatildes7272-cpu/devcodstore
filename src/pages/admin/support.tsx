import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: "Açık" | "İnceleniyor" | "Çözüldü" | "Kapandı";
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type StatusTab = "Tümü" | "Açık" | "İnceleniyor" | "Çözüldü" | "Kapandı";

const pageSize = 20;
const statusTabs: StatusTab[] = ["Tümü", "Açık", "İnceleniyor", "Çözüldü", "Kapandı"];

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

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [activeStatus, setActiveStatus] = useState<StatusTab>("Tümü");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [totalCount, setTotalCount] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  async function loadCounts() {
    const [allResult, openResult, reviewResult, solvedResult, closedResult] =
      await Promise.all([
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "Açık"),

        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "İnceleniyor"),

        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "Çözüldü"),

        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "Kapandı"),
      ]);

    setAllCount(allResult.count || 0);
    setOpenCount(openResult.count || 0);
    setReviewCount(reviewResult.count || 0);
    setSolvedCount(solvedResult.count || 0);
    setClosedCount(closedResult.count || 0);
  }

  async function loadTickets(targetPage = page, showLoading = true) {
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
        .from("support_tickets")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false });

      if (activeStatus !== "Tümü") {
        query = query.eq("status", activeStatus);
      }

      const cleanSearch = search.trim();

      if (cleanSearch) {
        const safeSearch = cleanSearch.replace(/[%_]/g, "");
        const like = `%${safeSearch}%`;

        query = query.or(
          [
            `subject.ilike.${like}`,
            `category.ilike.${like}`,
            `status.ilike.${like}`,
          ].join(",")
        );
      }

      query = query.range(from, to);

      const result = await withTimeout(
        query,
        15000,
        "Destek talepleri yüklenirken sunucu geç cevap verdi."
      );

      if (result.error) {
        setMessage("Destek talepleri yüklenemedi: " + result.error.message);
        setTickets([]);
        setProfiles([]);
        setTotalCount(0);
        return;
      }

      const ticketData = result.data || [];
      setTickets(ticketData);
      setTotalCount(result.count || 0);

      const userIds = Array.from(new Set(ticketData.map((ticket) => ticket.user_id)));

      if (userIds.length > 0) {
        const profileResult = await withTimeout(
          supabase
            .from("profiles")
            .select("id,email,full_name")
            .in("id", userIds),
          15000,
          "Kullanıcı bilgileri yüklenirken sunucu geç cevap verdi."
        );

        if (!profileResult.error) {
          setProfiles(profileResult.data || []);
        } else {
          setProfiles([]);
        }
      } else {
        setProfiles([]);
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
          : "Destek talepleri yüklenirken bilinmeyen hata oluştu."
      );
      setTickets([]);
      setProfiles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets(page, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [page, activeStatus, search]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-support-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          loadTickets(page, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, activeStatus, search]);

  function getUser(ticket: SupportTicket) {
    const profile = profiles.find((item) => item.id === ticket.user_id);

    return {
      name: profile?.full_name || "Kullanıcı",
      email: profile?.email || "E-posta yok",
    };
  }

  function statusClass(status: string) {
    if (status === "Çözüldü") {
      return "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "Kapandı") {
      return "rounded-full bg-gray-500/20 px-4 py-2 text-sm text-gray-300";
    }

    if (status === "İnceleniyor") {
      return "rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300";
    }

    return "rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
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

  function changeTab(status: StatusTab) {
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
        Destek talepleri yükleniyor...
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
              <h1 className="text-4xl font-bold">Destek Talepleri</h1>
              <p className="mt-3 text-gray-400">
                Kullanıcı ve satıcı destek taleplerini sayfa sayfa yönet.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadTickets(page, false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>

              <p className="text-xs text-gray-500">
                {lastUpdated ? `Son güncelleme: ${lastUpdated}` : "Sayfalı destek sistemi aktif"}
              </p>
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
            <p className="text-sm text-gray-400">Toplam Talep</p>
            <h2 className="mt-3 text-4xl font-bold">{allCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Açık</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">
              {openCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">İnceleniyor</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">
              {reviewCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Çözüldü</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">
              {solvedCount}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kapandı</p>
            <h2 className="mt-3 text-4xl font-bold text-gray-300">
              {closedCount}
            </h2>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid gap-3 md:grid-cols-5">
            {statusTabs.map((status) => {
              const count =
                status === "Tümü"
                  ? allCount
                  : status === "Açık"
                  ? openCount
                  : status === "İnceleniyor"
                  ? reviewCount
                  : status === "Çözüldü"
                  ? solvedCount
                  : closedCount;

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
                  {status} ({count})
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Talep Listesi</h2>
              <p className="mt-2 text-sm text-gray-400">
                Gösterilen: {visibleRange} / {totalCount} — Sayfa {page} / {totalPages}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Konu, kategori veya durum ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500 md:w-96"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {tickets.map((ticket) => {
              const user = getUser(ticket);

              return (
                <a
                  key={ticket.id}
                  href={`/admin/support/${ticket.id}`}
                  className="rounded-3xl border border-white/10 bg-black/30 p-5 transition hover:border-blue-500/40 hover:bg-white/10"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{ticket.subject}</h3>
                      <p className="mt-2 text-sm text-gray-400">
                        Kullanıcı: {user.name} — {user.email}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Kategori: {ticket.category}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Güncelleme: {formatDate(ticket.updated_at)}
                      </p>
                    </div>

                    <span className={statusClass(ticket.status)}>
                      {ticket.status}
                    </span>
                  </div>
                </a>
              );
            })}

            {tickets.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
                Talep bulunamadı.
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
