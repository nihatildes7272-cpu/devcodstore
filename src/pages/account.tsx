import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "buyer" | "seller" | "admin";
  created_at: string | null;
};

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [ordersCount, setOrdersCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [supportCount, setSupportCount] = useState(0);
  const [sellerProductCount, setSellerProductCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAccount() {
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    setUser(userData.user);

    const [
      profileResult,
      ordersResult,
      cartResult,
      notificationResult,
      supportResult,
      sellerProductsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,account_type,created_at")
        .eq("id", userData.user.id)
        .maybeSingle(),

      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.user.id),

      supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.user.id),

      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.user.id)
        .eq("is_read", false),

      supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.user.id),

      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", userData.user.id),
    ]);

    if (profileResult.error) {
      setMessage("Profil bilgisi yüklenemedi: " + profileResult.error.message);
    } else {
      setProfile(profileResult.data || null);
    }

    setOrdersCount(ordersResult.count || 0);
    setCartCount(cartResult.count || 0);
    setNotificationCount(notificationResult.count || 0);
    setSupportCount(supportResult.count || 0);
    setSellerProductCount(sellerProductsResult.count || 0);

    setLoading(false);
  }

  useEffect(() => {
    loadAccount();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function roleLabel(role?: string | null) {
    if (role === "admin") return "Admin";
    if (role === "seller") return "Satıcı";
    return "Alıcı";
  }

  function formatDate(date?: string | null) {
    if (!date) return "Tarih yok";

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Hesap bilgileri yükleniyor...
      </main>
    );
  }

  const isAdmin =
    profile?.account_type === "admin" || user?.email === "nihatildes1@gmail.com";

  const isSeller = profile?.account_type === "seller" || isAdmin;

  const quickLinks = [
    {
      title: "Ürünleri Keşfet",
      description: "Yayındaki dijital ürünleri incele.",
      href: "/products",
    },
    {
      title: "Dosyalarım",
      description: "Satın aldığın ürünlere eriş.",
      href: "/library",
    },
    {
      title: "Sepetim",
      description: "Sepete eklediğin ürünleri gör.",
      href: "/cart",
    },
    {
      title: "Bildirimler",
      description: "Ürün, sipariş ve destek bildirimlerini gör.",
      href: "/notifications",
    },
    {
      title: "Destek Merkezi",
      description: "Destek talebi oluştur veya taleplerini takip et.",
      href: "/support",
    },
    {
      title: "Satıcı Paneli",
      description: "Ürünlerini ve satışlarını yönet.",
      href: "/seller",
    },
  ];

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Hesabım</h1>
              <p className="mt-3 text-gray-400">
                Hesap bilgilerini, satın almalarını, sepetini ve hızlı erişimlerini buradan yönet.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-red-500/30 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10"
            >
              Çıkış Yap
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-3xl font-black">
              {(profile?.full_name || user?.email || "D").slice(0, 1).toUpperCase()}
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              {profile?.full_name || "Kullanıcı"}
            </h2>

            <p className="mt-2 break-all text-gray-400">
              {user?.email}
            </p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-gray-400">Hesap Rolü</p>
                <p className="mt-2 font-bold text-blue-300">
                  {roleLabel(profile?.account_type)}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-gray-400">Kayıt Tarihi</p>
                <p className="mt-2 font-bold">
                  {formatDate(profile?.created_at)}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-gray-400">Kullanıcı ID</p>
                <p className="mt-2 break-all text-sm font-bold">
                  {user?.id}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {isAdmin && (
                <a
                  href="/admin"
                  className="rounded-2xl bg-purple-600 px-5 py-3 text-center font-semibold hover:bg-purple-500"
                >
                  Admin Paneline Git
                </a>
              )}

              {isSeller && (
                <a
                  href="/seller"
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-semibold hover:bg-blue-500"
                >
                  Satıcı Paneline Git
                </a>
              )}

              <a
                href="/support"
                className="rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold hover:bg-white/10"
              >
                Destek Talebi Aç
              </a>
            </div>
          </div>

          <div className="grid gap-6">
            <section className="grid gap-6 md:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-gray-400">Satın Alınan</p>
                <h2 className="mt-3 text-4xl font-bold">{ordersCount}</h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-gray-400">Sepet</p>
                <h2 className="mt-3 text-4xl font-bold">{cartCount}</h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-gray-400">Bildirim</p>
                <h2 className="mt-3 text-4xl font-bold text-yellow-300">
                  {notificationCount}
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-gray-400">Destek Talebi</p>
                <h2 className="mt-3 text-4xl font-bold text-blue-300">
                  {supportCount}
                </h2>
              </div>
            </section>

            {isSeller && (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-bold">Satıcı Özeti</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Satıcı hesabına bağlı ürün bilgileri.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-black/30 p-5">
                    <p className="text-sm text-gray-400">Ürün Sayısı</p>
                    <p className="mt-2 text-3xl font-bold">{sellerProductCount}</p>
                  </div>

                  <a
                    href="/seller/new"
                    className="rounded-2xl bg-blue-600 p-5 font-semibold hover:bg-blue-500"
                  >
                    Yeni Ürün Yükle
                  </a>

                  <a
                    href="/seller/products"
                    className="rounded-2xl border border-white/15 p-5 font-semibold hover:bg-white/10"
                  >
                    Ürünlerimi Yönet
                  </a>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold">Hızlı Erişim</h2>
              <p className="mt-2 text-sm text-gray-400">
                En çok kullanılan bölümlere hızlı geçiş.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {quickLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-3xl border border-white/10 bg-black/30 p-5 transition hover:border-blue-500/40 hover:bg-white/10"
                  >
                    <h3 className="text-xl font-bold">{link.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {link.description}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
