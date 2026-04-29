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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");

  async function loadNotifications(showLoading = true) {
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

      const result = await withTimeout(
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(100),
        15000,
        "Bildirimler yüklenirken sunucu geç cevap verdi."
      );

      if (result.error) {
        setMessage("Bildirimler yüklenemedi: " + result.error.message);
        setNotifications([]);
      } else {
        setNotifications(result.data || []);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bildirimler yüklenirken bilinmeyen bir hata oluştu."
      );
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function setupNotifications() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      if (cancelled) return;

      setUser(data.user);
      await loadNotifications(true);

      channel = supabase
        .channel(`notifications-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${data.user.id}`,
          },
          () => {
            loadNotifications(false);
            window.dispatchEvent(new Event("devcodstore-notifications-updated"));
          }
        )
        .subscribe();

      interval = setInterval(() => {
        loadNotifications(false);
      }, 20000);
    }

    setupNotifications();

    return () => {
      cancelled = true;

      if (channel) {
        supabase.removeChannel(channel);
      }

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [router]);

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
    await loadNotifications(false);
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
    await loadNotifications(false);
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
    await loadNotifications(false);
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
    return "Bildirim";
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const visibleNotifications =
    activeFilter === "unread"
      ? notifications.filter((item) => !item.is_read)
      : notifications;

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

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Bildirimler</h1>
              <p className="mt-3 text-gray-400">
                Ürün, sipariş, yorum ve hesap olayları burada görünür.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadNotifications(false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>

              <p className="text-xs text-gray-500">
                Okunmamış: {unreadCount}
              </p>
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
            onClick={() => setActiveFilter("all")}
            className={
              activeFilter === "all"
                ? "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                : "rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
            }
          >
            Tüm Bildirimler ({notifications.length})
          </button>

          <button
            onClick={() => setActiveFilter("unread")}
            className={
              activeFilter === "unread"
                ? "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                : "rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
            }
          >
            Okunmamış ({unreadCount})
          </button>

          <button
            onClick={markAllAsRead}
            className="rounded-2xl border border-green-500/30 px-5 py-3 text-sm font-semibold text-green-300 hover:bg-green-500/10"
          >
            Tümünü Okundu Yap
          </button>
        </section>

        <section className="grid gap-4">
          {visibleNotifications.map((notification) => (
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

          {visibleNotifications.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
              <h2 className="text-2xl font-bold">Bildirim yok</h2>
              <p className="mt-2 text-gray-400">
                Yeni ürün, sipariş veya yorum olayları burada görünecek.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
