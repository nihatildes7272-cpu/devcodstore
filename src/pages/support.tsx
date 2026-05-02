import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: "Açık" | "İnceleniyor" | "Çözüldü" | "Kapandı";
  created_at: string;
  updated_at: string;
};

const pageSize = 10;

const categories = [
  "Genel",
  "Satın Alma",
  "Dosya İndirme",
  "Satıcı Başvurusu",
  "Ürün Sorunu",
  "Teknik Destek",
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

export default function SupportPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Genel");
  const [ticketMessage, setTicketMessage] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const loadTickets = useCallback(
    async (targetPage = page, showLoading = true) => {
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

        const result = await withTimeout(
          supabase
            .from("support_tickets")
            .select("*", { count: "exact" })
            .eq("user_id", currentUser.id)
            .order("updated_at", { ascending: false })
            .range(from, to),
          15000,
          "Destek talepleri yüklenirken sunucu geç cevap verdi."
        );

        if (result.error) {
          setMessage("Destek talepleri yüklenemedi: " + result.error.message);
          setTickets([]);
          setTotalCount(0);
        } else {
          setTickets(result.data || []);
          setTotalCount(result.count || 0);
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Destek talepleri yüklenirken bilinmeyen hata oluştu."
        );
        setTickets([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, router]
  );

  useEffect(() => {
    const fetchTickets = async () => {
      await loadTickets(1, true);
    };

    void fetchTickets();
  }, [loadTickets]);

  useEffect(() => {
    const fetchTickets = async () => {
      await loadTickets(page, true);
    };

    void fetchTickets();
  }, [loadTickets, page]);

  async function createTicket(event: React.FormEvent) {
    event.preventDefault();

    if (!user) {
      setMessage("Destek talebi oluşturmak için giriş yapmalısın.");
      return;
    }

    if (!subject.trim() || !ticketMessage.trim()) {
      setMessage("Konu ve mesaj alanları boş olamaz.");
      return;
    }

    setCreating(true);
    setMessage("");

    const { data: ticketData, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category,
        status: "Açık",
      })
      .select("*")
      .single();

    if (ticketError || !ticketData) {
      setCreating(false);
      setMessage("Destek talebi oluşturulamadı: " + (ticketError?.message || ""));
      return;
    }

    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketData.id,
        user_id: user.id,
        role: "user",
        message: ticketMessage.trim(),
      });

    setCreating(false);

    if (messageError) {
      setMessage("Talep oluşturuldu fakat mesaj eklenemedi: " + messageError.message);
      return;
    }

    setSubject("");
    setCategory("Genel");
    setTicketMessage("");

    router.push(`/support/${ticketData.id}`);
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

  const visibleRange =
    totalCount === 0
      ? "0"
      : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalCount)}`;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Destek talepleri yükleniyor...
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
              <h1 className="text-4xl font-bold">Destek Merkezi</h1>
              <p className="mt-3 text-gray-400">
                Satın alma, dosya indirme, satıcı işlemleri ve teknik sorunlar için destek talebi oluşturabilirsin.
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
                Gösterilen: {visibleRange} / {totalCount}
              </p>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Destek Taleplerim</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Açtığın destek taleplerini sayfa sayfa takip edebilirsin.
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-gray-300">
                Sayfa {page} / {totalPages}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/support/${ticket.id}`}
                  className="rounded-3xl border border-white/10 bg-black/30 p-5 transition hover:border-blue-500/40 hover:bg-white/10"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{ticket.subject}</h3>
                      <p className="mt-2 text-sm text-gray-400">
                        Kategori: {ticket.category}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Son güncelleme: {formatDate(ticket.updated_at)}
                      </p>
                    </div>

                    <span className={statusClass(ticket.status)}>
                      {ticket.status}
                    </span>
                  </div>
                </Link>
              ))}

              {tickets.length === 0 && (
                <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
                  Henüz destek talebin yok.
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
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Yeni Destek Talebi</h2>
            <p className="mt-2 text-sm text-gray-400">
              Sorununu detaylı yazarsan daha hızlı yardımcı olabiliriz.
            </p>

            <form onSubmit={createTicket} className="mt-6 grid gap-4">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Konu"
                required
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <textarea
                value={ticketMessage}
                onChange={(event) => setTicketMessage(event.target.value)}
                placeholder="Mesajını yaz..."
                required
                className="min-h-40 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <button
                type="submit"
                disabled={creating}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {creating ? "Oluşturuluyor..." : "Talep Oluştur"}
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
