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

const statusTabs = ["Tümü", "Açık", "İnceleniyor", "Çözüldü", "Kapandı"] as const;

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeStatus, setActiveStatus] = useState<(typeof statusTabs)[number]>("Tümü");
  const [search, setSearch] = useState("");

  async function loadTickets() {
    setLoading(true);
    setMessage("");

    const { data: ticketData, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,email,full_name");

    if (ticketError) {
      setMessage("Destek talepleri yüklenemedi: " + ticketError.message);
      setTickets([]);
    } else {
      setTickets(ticketData || []);
    }

    setProfiles(profileData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

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

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const user = getUser(ticket);

      const matchesStatus =
        activeStatus === "Tümü" || ticket.status === activeStatus;

      const text = `${ticket.subject} ${ticket.category} ${ticket.status} ${user.name} ${user.email}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [tickets, profiles, activeStatus, search]);

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
                Kullanıcı ve satıcı destek taleplerini yönet.
              </p>
            </div>

            <button
              onClick={loadTickets}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Yenile
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Talep</p>
            <h2 className="mt-3 text-4xl font-bold">{tickets.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Açık</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">
              {tickets.filter((item) => item.status === "Açık").length}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">İnceleniyor</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">
              {tickets.filter((item) => item.status === "İnceleniyor").length}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Çözüldü</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">
              {tickets.filter((item) => item.status === "Çözüldü").length}
            </h2>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid gap-3 md:grid-cols-5">
            {statusTabs.map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={
                  activeStatus === status
                    ? "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                    : "rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
                }
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Talep Listesi</h2>
              <p className="mt-2 text-sm text-gray-400">
                Gösterilen talep sayısı: {filteredTickets.length}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Konu, kullanıcı, kategori ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500 md:w-96"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {filteredTickets.map((ticket) => {
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

            {filteredTickets.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
                Talep bulunamadı.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
