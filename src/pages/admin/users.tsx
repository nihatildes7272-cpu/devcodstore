import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "buyer" | "seller" | "admin";
  storage_quota_bytes?: number | null;
  seller_trust_score?: number | null;
  seller_clean_product_count?: number | null;
  seller_risky_product_count?: number | null;
  auto_publish_enabled?: boolean | null;
  created_at?: string | null;
};

type RoleFilter = "Tümü" | "buyer" | "seller" | "admin";

const pageSize = 30;
const roleFilters: RoleFilter[] = ["Tümü", "buyer", "seller", "admin"];

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

function formatBytes(value?: number | null) {
  if (!value) return "0 B";

  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;

  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function gbToBytes(value: number) {
  return Math.round(value * 1024 * 1024 * 1024);
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [buyerCount, setBuyerCount] = useState(0);
  const [sellerCount, setSellerCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("Tümü");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  async function loadCounts() {
    const [buyers, sellers, admins] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("account_type", "buyer"),

      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("account_type", "seller"),

      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("account_type", "admin"),
    ]);

    setBuyerCount(buyers.count || 0);
    setSellerCount(sellers.count || 0);
    setAdminCount(admins.count || 0);
  }

  async function loadUsers(targetPage = page, showLoading = true) {
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
        .from("profiles")
        .select("id,email,full_name,account_type,storage_quota_bytes,seller_trust_score,seller_clean_product_count,seller_risky_product_count,auto_publish_enabled,created_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (roleFilter !== "Tümü") {
        query = query.eq("account_type", roleFilter);
      }

      if (search.trim()) {
        const safeSearch = search.trim().replace(/[%_]/g, "");
        const like = `%${safeSearch}%`;

        query = query.or(
          [
            `email.ilike.${like}`,
            `full_name.ilike.${like}`,
            `account_type.ilike.${like}`,
          ].join(",")
        );
      }

      const result = await withTimeout(
        query,
        15000,
        "Kullanıcılar yüklenirken sunucu geç cevap verdi."
      );

      if (result.error) {
        setMessage("Kullanıcılar yüklenemedi: " + result.error.message);
        setProfiles([]);
        setTotalCount(0);
        return;
      }

      setProfiles(result.data || []);
      setTotalCount(result.count || 0);

      await loadCounts();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Kullanıcılar yüklenirken bilinmeyen hata oluştu."
      );
      setProfiles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(page, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [page, search, roleFilter]);

  async function updateRole(profileId: string, accountType: "buyer" | "seller" | "admin") {
    const confirmed = window.confirm(`Bu kullanıcının rolü "${accountType}" yapılsın mı?`);

    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .update({ account_type: accountType })
      .eq("id", profileId);

    if (error) {
      setMessage("Rol güncellenemedi: " + error.message);
      return;
    }

    setMessage("Kullanıcı rolü güncellendi.");
    await loadUsers(page, false);
  }

  async function updateStorageQuota(profile: Profile) {
    const currentGb = ((profile.storage_quota_bytes || 2147483648) / (1024 * 1024 * 1024)).toFixed(2);

    const value = window.prompt(
      "Satıcı depolama kotasını GB olarak yaz:",
      currentGb
    );

    if (value === null) return;

    const gb = Number(value.replace(",", "."));

    if (!Number.isFinite(gb) || gb <= 0) {
      setMessage("Geçerli bir GB değeri yazmalısın.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ storage_quota_bytes: gbToBytes(gb) })
      .eq("id", profile.id);

    if (error) {
      setMessage("Depolama kotası güncellenemedi: " + error.message);
      return;
    }

    setMessage("Depolama kotası güncellendi.");
    await loadUsers(page, false);
  }

  function roleLabel(role: string) {
    if (role === "admin") return "Admin";
    if (role === "seller") return "Satıcı";
    return "Alıcı";
  }

  function roleClass(role: string) {
    if (role === "admin") {
      return "rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300";
    }

    if (role === "seller") {
      return "rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300";
    }

    return "rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300";
  }

  function formatDate(date?: string | null) {
    if (!date) return "Tarih yok";

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function changeRoleFilter(role: RoleFilter) {
    setRoleFilter(role);
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
        Kullanıcılar yükleniyor...
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
              <h1 className="text-4xl font-black tracking-tight">Kullanıcı Yönetimi</h1>
              <p className="mt-3 text-gray-300">
                Kullanıcıları sayfa sayfa yönet, rollerini ve satıcı depolama kotasını düzenle.
              </p>
            </div>

            <button
              onClick={() => loadUsers(page, false)}
              disabled={refreshing}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {refreshing ? "Yenileniyor..." : "Yenile"}
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            {message}
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {[
            { label: "Toplam", value: totalCount, color: "text-white" },
            { label: "Alıcı", value: buyerCount, color: "text-green-400" },
            { label: "Satıcı", value: sellerCount, color: "text-blue-400" },
            { label: "Admin", value: adminCount, color: "text-purple-400" },
          ].map((stat, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
              <h2 className={`mt-3 text-4xl font-black ${stat.color}`}>
                {stat.value}
              </h2>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {roleFilters.map((role) => (
              <button
                key={role}
                onClick={() => changeRoleFilter(role)}
                className={`rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                  roleFilter === role
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "border border-white/10 text-gray-400 hover:bg-white/5"
                }`}
              >
                {role === "Tümü" ? "Tümü" : roleLabel(role)}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Kullanıcı Listesi</h2>
              <p className="mt-2 text-sm text-gray-400">
                Gösterilen: {visibleRange} / {totalCount} — Sayfa {page} / {totalPages}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="E-posta, isim veya rol ara..."
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white outline-none placeholder:text-gray-600 focus:border-blue-500/50 md:w-96 transition-all"
            />
          </div>

          <div className="mt-10 grid gap-4">
            {profiles.map((profile) => (
              <div key={profile.id} className="group rounded-3xl border border-white/5 bg-white/5 p-6 transition hover:bg-white/[0.08]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-3">
                      <span className={roleClass(profile.account_type)}>
                        {roleLabel(profile.account_type)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-black group-hover:text-blue-300 transition-colors">
                      {profile.full_name || "İsimsiz Kullanıcı"}
                    </h3>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-500">
                      <p>📧 {profile.email || "E-posta yok"}</p>
                      <p>📅 {formatDate(profile.created_at)}</p>
                      <p className="truncate">🆔 {profile.id}</p>
                      <p>💾 Kota: {formatBytes(profile.storage_quota_bytes || 2147483648)}</p>
                      <p>🛡️ Güven: {profile.seller_trust_score ?? 0}/100</p>
                      <p>⚡ Otomatik Yayın: {profile.auto_publish_enabled ? "Açık" : "Kapalı"}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:min-w-52">
                    <button
                      onClick={() => updateRole(profile.id, "buyer")}
                      className="rounded-2xl border border-green-500/30 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/10"
                    >
                      Alıcı Yap
                    </button>

                    <button
                      onClick={() => updateRole(profile.id, "seller")}
                      className="rounded-2xl border border-blue-500/30 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/10"
                    >
                      Satıcı Yap
                    </button>

                    <button
                      onClick={() => updateRole(profile.id, "admin")}
                      className="rounded-2xl border border-purple-500/30 px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/10"
                    >
                      Admin Yap
                    </button>

                    <button
                      onClick={() => updateStorageQuota(profile)}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
                    >
                      Kota Düzenle
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {profiles.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
                Kullanıcı bulunamadı.
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
