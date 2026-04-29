import { useEffect, useState } from "react";
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

type SupportMessage = {
  id: string;
  ticket_id: string;
  user_id: string;
  role: "user" | "admin";
  message: string;
  created_at: string;
};

export default function SupportDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState("");

  async function loadTicket() {
    if (!router.isReady || !id) return;

    setLoading(true);
    setInfo("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    setUser(userData.user);

    const { data: ticketData, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", String(id))
      .maybeSingle();

    if (ticketError || !ticketData) {
      setInfo("Destek talebi bulunamadı veya erişim iznin yok.");
      setTicket(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    setTicket(ticketData);

    const { data: messageData, error: messageError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketData.id)
      .order("created_at", { ascending: true });

    if (messageError) {
      setInfo("Mesajlar yüklenemedi: " + messageError.message);
      setMessages([]);
    } else {
      setMessages(messageData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTicket();
  }, [router.isReady, id]);

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();

    if (!user || !ticket || !reply.trim()) return;

    setSending(true);
    setInfo("");

    const { error } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        user_id: user.id,
        role: "user",
        message: reply.trim(),
      });

    if (error) {
      setInfo("Mesaj gönderilemedi: " + error.message);
      setSending(false);
      return;
    }

    await supabase
      .from("support_tickets")
      .update({
        status: "Açık",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    setReply("");
    setSending(false);
    await loadTicket();
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Destek talebi yükleniyor...
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="min-h-screen bg-[#070A12] text-white">
        <section className="mx-auto max-w-5xl px-6 py-10">
          <SiteNavbar />

          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <h1 className="text-3xl font-bold">Talep bulunamadı</h1>
            <p className="mt-3 text-red-200">{info}</p>

            <a
              href="/support"
              className="mt-8 inline-block rounded-2xl bg-white px-5 py-3 font-semibold text-black"
            >
              Destek Merkezine Dön
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SiteNavbar />

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">{ticket.subject}</h1>
              <p className="mt-3 text-gray-400">Kategori: {ticket.category}</p>
              <p className="mt-1 text-sm text-gray-500">
                Oluşturulma: {formatDate(ticket.created_at)}
              </p>
            </div>

            <span className={statusClass(ticket.status)}>
              {ticket.status}
            </span>
          </div>
        </section>

        {info && (
          <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            {info}
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Mesajlar</h2>

          <div className="mt-6 grid gap-4">
            {messages.map((item) => (
              <div
                key={item.id}
                className={
                  item.role === "admin"
                    ? "rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5"
                    : "rounded-3xl border border-white/10 bg-black/30 p-5"
                }
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-bold">
                    {item.role === "admin" ? "Admin" : "Sen"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {formatDate(item.created_at)}
                  </p>
                </div>

                <p className="mt-4 leading-7 text-gray-300">
                  {item.message}
                </p>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="rounded-2xl bg-black/30 p-6 text-center text-gray-400">
                Henüz mesaj yok.
              </div>
            )}
          </div>
        </section>

        {ticket.status !== "Kapandı" && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Yanıt Yaz</h2>

            <form onSubmit={sendReply} className="mt-6 grid gap-4">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Yanıtını yaz..."
                required
                className="min-h-32 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <button
                type="submit"
                disabled={sending}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {sending ? "Gönderiliyor..." : "Yanıt Gönder"}
              </button>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}
