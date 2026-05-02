import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const pageSize = 15;

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

export default function NotificationsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  async function loadNotifications(targetPage = page, showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const userResult = await withTimeout(
        supabase.auth.getUser(),
        10000,
        "Kullanıcı bilgisi alınırken gecikme oldu."
      );

      const currentUser = userResult.data.user;

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      const from = (targetPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (activeFilter === "unread") {
        query = query.eq("is_read", false);
      }

      const [notificationsResult, unreadResult] = await Promise.all([
        withTimeout(
          query,
          15000,
          "Bildirimler yüklenirken sunucu geç cevap verdi."
        ),
        withTimeout(
          supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", currentUser.id)
            .eq("is_read", false),
          15000,
          "Okunmamış bildirim sayısı alınamadı."
        ),
      ]);

      if (notificationsResult.error) {
        setMessage("Bildirimler yüklenemedi: " + notificationsResult.error.message);
        setNotifications([]);
        setTotalCount(0);
      } else {
        setNotifications(notificationsResult.data || []);
        setTotalCount(notificationsResult.count || 0);
      }

      setUnreadCount(unreadResult.count || 0);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bildirimler yüklenirken bilinmeyen bir hata oluştu."
      );
      setNotifications([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel("notifications-page-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications(page, false);
          window.dispatchEvent(new Event("devcodstore-notifications-updated"));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    loadNotifications(page, true);
  }, [page, activeFilter]);

  async function markAsRead(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      setMessage("Bildirim okundu yapılamadı: " + error.message);
      return;
    }

    window.dispatchEvent(new Event("devcodstore-notifications-updated"));
    await loadNotifications(page, false);
  }

  async function markAllAsRead() {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      setMessage("Bildirimler okundu yapılamadı: " + error.message);
      return;
    }

    window.dispatchEvent(new Event("devcodstore-notifications-updated"));
    await loadNotifications(1, false);
    setPage(1);
  }

  async function deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      setMessage("Bildirim silinemedi: " + error.message);
      return;
    }

    window.dispatchEvent(new Event("devcodstore-notifications-updated"));
    await loadNotifications(page, false);
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

  function typeLabel(type: string) {
    if (type === "product_submitted") return "Ürün Onayı";
    if (type === "product_status_changed") return "Ürün Durumu";
    if (type === "order_created") return "Satış";
    if (type === "purchase_completed") return "Satın Alma";
    if (type === "review_created") return "Yorum";
    if (type === "support_user_message") return "Destek";
    if (type === "support_admin_reply") return "Destek Yanıtı";
    if (type === "support_status_changed") return "Destek Durumu";
    return "Bildirim";
  }

  const visibleRange =
    totalCount === 0
      ? "0"
      : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalCount)}`;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Bildirimler yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-transparent p-8 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Bildirimler</h1>
              <p className="mt-3 text-gray-300">
                Ürün, sipariş, yorum ve destek bildirimlerin burada görünür.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Okunmamış</p>
                <p className="text-2xl font-black text-yellow-400">{unreadCount}</p>
              </div>
              <button
                onClick={() => loadNotifications(page, false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="mb-8 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 md:grid-cols-3">
          <button
            onClick={() => {
              setActiveFilter("all");
              setPage(1);
            }}
            className={`rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
              activeFilter === "all"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "border border-white/10 text-gray-400 hover:bg-white/5"
            }`}
          >
            Tüm Bildirimler ({activeFilter === "all" ? totalCount : "..."})
          </button>

          <button
            onClick={() => {
              setActiveFilter("unread");
              setPage(1);
            }}
            className={`rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
              activeFilter === "unread"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "border border-white/10 text-gray-400 hover:bg-white/5"
            }`}
          >
            Okunmamış ({unreadCount})
          </button>

          <button
            onClick={markAllAsRead}
            className="rounded-2xl border border-green-500/30 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-500/10"
          >
            Tümünü Okundu Yap
          </button>
        </section>

        <div className="mb-5 flex flex-col gap-2 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
          <p>
            Gösterilen: {visibleRange} / {totalCount}
          </p>

          <p>Sayfa {page} / {totalPages}</p>
        </div>

        <section className="grid gap-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={
                notification.is_read
                  ? "rounded-3xl border border-white/10 bg-white/5 p-6"
                  : "rounded-3xl border border-blue-500/30 bg-blue-500/10 p-6"
              }
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300">
                      {typeLabel(notification.type)}
                    </span>

                    {!notification.is_read && (
                      <span className="rounded-full bg-blue-600 px-3 py-1 text-sm text-white">
                        Yeni
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-2xl font-bold">{notification.title}</h2>

                  <p className="mt-3 leading-7 text-gray-300">
                    {notification.message}
                  </p>

                  <p className="mt-3 text-sm text-gray-500">
                    {formatDate(notification.created_at)}
                  </p>
                </div>

                <div className="grid gap-3 md:min-w-44">
                  {notification.link && (
                    <a
                      href={notification.link}
                      onClick={() => markAsRead(notification.id)}
                      className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                    >
                      Aç
                    </a>
                  )}

                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
                    >
                      Okundu Yap
                    </button>
                  )}

                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="rounded-2xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
              <h2 className="text-2xl font-bold">Bildirim yok</h2>
              <p className="mt-2 text-gray-400">
                Yeni ürün, sipariş veya destek olayları burada görünecek.
              </p>
            </div>
          )}
        </section>

        {totalCount > pageSize && (
          <section className="mt-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:flex-row md:items-center md:justify-between">
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
    </main>
  );
}
