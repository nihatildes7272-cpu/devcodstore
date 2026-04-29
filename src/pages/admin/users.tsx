import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "buyer" | "seller" | "admin";
  created_at: string | null;
  updated_at: string | null;
};

const accountTypes = [
  { value: "buyer", label: "Alıcı" },
  { value: "seller", label: "Satıcı" },
  { value: "admin", label: "Admin" },
];

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function loadProfiles() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Kullanıcılar yüklenirken hata oluştu: " + error.message);
      setProfiles([]);
    } else {
      setProfiles(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  async function updateAccountType(userId: string, accountType: "buyer" | "seller" | "admin") {
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        account_type: accountType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      setMessage("Hesap türü güncellenemedi: " + error.message);
      return;
    }

    await loadProfiles();
  }

  function accountTypeLabel(type: string) {
    if (type === "admin") return "Admin";
    if (type === "seller") return "Satıcı";
    return "Alıcı";
  }

  function accountTypeClass(type: string) {
    if (type === "admin") {
      return "w-fit rounded-full bg-purple-500/20 px-4 py-2 text-sm text-purple-300";
    }

    if (type === "seller") {
      return "w-fit rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300";
    }

    return "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
  }

  function formatDate(date: string | null) {
    if (!date) return "Tarih yok";

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filteredProfiles = profiles.filter((profile) => {
    const text = `${profile.email || ""} ${profile.full_name || ""} ${profile.account_type}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const buyerCount = profiles.filter((profile) => profile.account_type === "buyer").length;
  const sellerCount = profiles.filter((profile) => profile.account_type === "seller").length;
  const adminCount = profiles.filter((profile) => profile.account_type === "admin").length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Kullanıcılar yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Kullanıcı</p>
            <h2 className="mt-3 text-4xl font-bold">{profiles.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Alıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{buyerCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Satıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">{sellerCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Admin</p>
            <h2 className="mt-3 text-4xl font-bold text-purple-300">{adminCount}</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Kullanıcı Listesi</h2>
              <p className="mt-2 text-sm text-gray-400">
                Kullanıcıların hesap türünü buradan değiştirebilirsin.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ad, e-posta veya rol ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500 md:w-80"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="flex flex-col gap-5 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="max-w-2xl">
                  <h3 className="text-xl font-semibold">
                    {profile.full_name || "İsimsiz Kullanıcı"}
                  </h3>

                  <div className="mt-2 grid gap-1 text-sm text-gray-400">
                    <p>Kullanıcı No: {profile.id}</p>
                    <p>E-posta: {profile.email || "E-posta yok"}</p>
                    <p>Kayıt tarihi: {formatDate(profile.created_at)}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:min-w-64 md:text-right">
                  <span className={accountTypeClass(profile.account_type)}>
                    {accountTypeLabel(profile.account_type)}
                  </span>

                  <select
                    value={profile.account_type}
                    onChange={(event) =>
                      updateAccountType(
                        profile.id,
                        event.target.value as "buyer" | "seller" | "admin"
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  >
                    {accountTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            {filteredProfiles.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center">
                <h3 className="text-2xl font-bold">Kullanıcı bulunamadı</h3>
                <p className="mt-2 text-gray-400">
                  Arama sonucunda eşleşen kullanıcı yok.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
