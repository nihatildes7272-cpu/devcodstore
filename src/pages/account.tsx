import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "buyer" | "seller" | "admin";
  created_at: string | null;
  updated_at: string | null;
};

const purchasedProducts = [
  {
    title: "Modern E-Ticaret Sitesi",
    date: "26 Nisan 2026",
    status: "Aktif",
  },
  {
    title: "Admin Panel Paketi",
    date: "25 Nisan 2026",
    status: "Aktif",
  },
];

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setMessage("");

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.push("/login");
        return;
      }

      const currentUser = userData.user;
      setUser(currentUser);

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (existingProfile && !profileError) {
        setProfile(existingProfile);
        setLoading(false);
        return;
      }

      if (profileError) {
        console.error("Profil okuma hatası:", profileError);
      }

      const fallbackProfile = {
        id: currentUser.id,
        email: currentUser.email || "",
        full_name:
          currentUser.user_metadata?.full_name || "İsimsiz Kullanıcı",
        account_type:
          currentUser.user_metadata?.account_type || "buyer",
      };

      const { data: createdProfile, error: createError } = await supabase
        .from("profiles")
        .upsert(fallbackProfile)
        .select("*")
        .single();

      if (createError) {
        setMessage("");
        console.error("Profil oluşturma hatası:", createError);
      } else {
        setProfile(createdProfile);
      }

      setLoading(false);
    }

    loadAccount();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        <p>Hesap bilgileri yükleniyor...</p>
      </main>
    );
  }

  const fullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    "İsimsiz Kullanıcı";

  const email =
    profile?.email ||
    user?.email ||
    "E-posta yok";

  const accountTypeValue =
    profile?.account_type ||
    user?.user_metadata?.account_type ||
    "buyer";

  const accountType =
    accountTypeValue === "seller"
      ? "Satıcı hesabı"
      : accountTypeValue === "admin"
      ? "Admin hesabı"
      : "Alıcı hesabı";

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore Hesabım</h1>
            <p className="text-sm text-gray-400">
              Profil, satın almalar ve dosya erişimi
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Ana Sayfa
            </a>

            <a
              href="/products"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Ürünler
            </a>

            <a
              href="/library"
              className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Dosyalarım
            </a>
          </div>
        </nav>

        {message && (
          <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
            {message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kullanıcı</p>
            <h2 className="mt-3 text-2xl font-bold">{fullName}</h2>
            <p className="mt-2 text-sm text-gray-400">{accountType}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">E-posta</p>
            <h2 className="mt-3 break-all text-xl font-bold">{email}</h2>
            <p className="mt-2 text-sm text-green-300">Giriş yapıldı</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Hesap Durumu</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">Aktif</h2>
            <button
              onClick={handleLogout}
              className="mt-5 rounded-2xl bg-red-600 px-5 py-2 text-sm font-semibold hover:bg-red-500"
            >
              Çıkış Yap
            </button>
          </div>
        </section>

        <section className="mt-10 grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Satın Alma Geçmişi</h2>

            <div className="mt-6 grid gap-4">
              {purchasedProducts.map((product) => (
                <div
                  key={product.title}
                  className="flex flex-col gap-4 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-semibold">{product.title}</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Satın alma tarihi: {product.date}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300">
                    {product.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Hızlı İşlemler</h2>

            <div className="mt-6 grid gap-3">
              <a
                href="/library"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-semibold hover:bg-blue-500"
              >
                Dosyalarımı Aç
              </a>

              <a
                href="/products"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold hover:bg-white/10"
              >
                Yeni Ürün Keşfet
              </a>

              <a
                href="/seller"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold hover:bg-white/10"
              >
                Satıcı Paneline Git
              </a>

              <a
                href="/"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold hover:bg-white/10"
              >
                Ana Sayfa
              </a>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
