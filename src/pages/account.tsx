import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

  const loadAccount = useCallback(async () => {
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
  }, [router]);

  useEffect(() => {
    const fetchAccount = async () => {
      await loadAccount();
    };

    void fetchAccount();
  }, [loadAccount]);

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
      href: "/products", icon: "🛍️"
    },
    {
      title: "Dosyalarım",
      description: "Satın aldığın ürünlere eriş.",
      href: "/library", icon: "📁"
    },
    {
      title: "Sepetim",
      description: "Sepete eklediğin ürünleri gör.",
      href: "/cart", icon: "🛒"
    },
    {
      title: "Bildirimler",
      description: "Ürün, sipariş ve destek bildirimlerini gör.",
      href: "/notifications", icon: "🔔"
    },
    {
      title: "Destek Merkezi",
      description: "Destek talebi oluştur veya taleplerini takip et.",
      href: "/support", icon: "🎧"
    },
    {
      title: "Satıcı Paneli",
      description: "Ürünlerini ve satışlarını yönet.",
      href: "/seller", icon: "💼"
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

        <section className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <div className="h-fit rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-transparent p-8 shadow-xl backdrop-blur-md">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-4xl font-black shadow-lg shadow-blue-500/20">
              {(profile?.full_name || user?.email || "D").slice(0, 1).toUpperCase()}
            </div>

            <h2 className="mt-8 text-3xl font-bold tracking-tight">
              {profile?.full_name || "Kullanıcı"}
            </h2>

            <p className="mt-2 break-all text-gray-400">
              {user?.email}
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                <p className="text-sm text-gray-400">Hesap Rolü</p>
                <p className="mt-2 font-bold text-blue-300">
                  {roleLabel(profile?.account_type)}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                <p className="text-sm text-gray-400">Kayıt Tarihi</p>
                <p className="mt-2 font-bold">
                  {formatDate(profile?.created_at)}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                <p className="text-sm text-gray-400">Kullanıcı ID</p>
                <p className="mt-2 break-all text-sm font-bold">
                  {user?.id}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {isAdmin && (
              <Link
                href="/admin"
                className="rounded-2xl bg-purple-600 px-5 py-3 text-center font-semibold hover:bg-purple-500"
              >
                Admin Paneline Git
              </Link>
            )}

            {isSeller && (
              <Link
                href="/seller"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-semibold hover:bg-blue-500"
              >
                Satıcı Paneline Git
              </Link>
            )}

            <Link
              href="/support"
              className="rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold hover:bg-white/10"
            >
              Destek Talebi Aç
            </Link>
            </div>
          </div>

          <div className="grid gap-6">
            <section className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {[
                { label: "Satın Alınan", value: ordersCount, color: "text-white" },
                { label: "Sepet", value: cartCount, color: "text-white" },
                { label: "Bildirim", value: notificationCount, color: "text-yellow-300" },
                { label: "Destek Talebi", value: supportCount, color: "text-blue-300" },
              ].map((stat, i) => (
                <div key={i} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm transition hover:border-white/20">
                  <p className="text-sm text-gray-400 font-medium">{stat.label}</p>
                  <h2 className={`mt-3 text-4xl font-black ${stat.color}`}>
                    {stat.value}
                  </h2>
                </div>
              ))}
            </section>

            {isSeller && (
              <section className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-8 shadow-inner shadow-blue-500/10">
                <h2 className="text-2xl font-bold">Satıcı Özeti</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Satıcı hesabına bağlı ürün bilgileri.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 border border-white/5 p-5">
                    <p className="text-sm text-gray-400">Ürün Sayısı</p>
                    <p className="mt-2 text-3xl font-black">{sellerProductCount}</p>
                  </div>

                  <Link
                    href="/seller/new"
                    className="flex items-center justify-center rounded-2xl bg-blue-600 p-5 font-bold text-white transition hover:bg-blue-500 hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-600/20"
                  >
                    Yeni Ürün Yükle
                  </Link>

                  <Link
                    href="/seller/products"
                    className="flex items-center justify-center rounded-2xl border border-white/15 p-5 font-bold transition hover:bg-white/10"
                  >
                    Ürünlerimi Yönet
                  </Link>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold">Hızlı Erişim</h2>
              <p className="mt-2 text-sm text-gray-400">
                En çok kullanılan bölümlere hızlı geçiş.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-start gap-4 rounded-3xl border border-white/5 bg-white/5 p-6 transition-all duration-300 hover:border-blue-500/40 hover:bg-white/10 hover:-translate-y-1 shadow-lg"
                  >
                    <div className="text-3xl grayscale group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-110">
                      {link.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-blue-300 transition-colors">{link.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-400 group-hover:text-gray-300 transition-colors">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
