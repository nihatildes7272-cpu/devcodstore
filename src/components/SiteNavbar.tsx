import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function SiteNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [refreshToken] = useState(() => Date.now());

  async function checkAdmin(currentUser: User | null) {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", currentUser.id)
      .maybeSingle();

    setIsAdmin(
      data?.account_type === "admin" ||
      currentUser.email === "nihatildes1@gmail.com"
    );
  }

  async function loadNotificationCount(currentUser?: User | null) {
    if (!currentUser) {
      setNotificationCount(0);
      return;
    }

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", currentUser.id)
      .eq("is_read", false);

    setNotificationCount(count || 0);
  }

  async function loadCartCount(currentUser?: User | null) {
    if (currentUser) {
      const { count } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUser.id);

      setCartCount(count || 0);
      return;
    }

    if (typeof window === "undefined") return;

    try {
      const rawCart = localStorage.getItem("devcodstore_cart");
      const cartItems = rawCart ? JSON.parse(rawCart) : [];
      setCartCount(Array.isArray(cartItems) ? cartItems.length : 0);
    } catch {
      setCartCount(0);
    }
  }

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      await checkAdmin(data.user);
      await loadCartCount(data.user);
      await loadNotificationCount(data.user);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;

        setUser(currentUser);
        await checkAdmin(currentUser);
        await loadCartCount(currentUser);
        await loadNotificationCount(currentUser);
      }
    );

    async function refreshNavbarStats() {
      const { data } = await supabase.auth.getUser();
      await loadCartCount(data.user);
      await loadNotificationCount(data.user);
    }

    window.addEventListener("storage", refreshNavbarStats);
    window.addEventListener("devcodstore-cart-updated", refreshNavbarStats);
    window.addEventListener("devcodstore-notifications-updated", refreshNavbarStats);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("storage", refreshNavbarStats);
      window.removeEventListener("devcodstore-cart-updated", refreshNavbarStats);
      window.removeEventListener("devcodstore-notifications-updated", refreshNavbarStats);
    };
  }, []);

  const links = [
    { href: "/products", label: "Ürünler" },
    { href: "/seller", label: "Satıcı Ol" },
    { href: "/library", label: "Dosyalarım" },
    { href: "/about", label: "Hakkımızda" },
    { href: "/contact", label: "İletişim" },
    { href: "/support", label: "Destek" },
    { href: "/yasal", label: "Yasal" },
  ];

  return (
    <nav className="sticky top-6 z-[100] mb-12 flex items-center justify-between gap-6 rounded-3xl border border-white/10 bg-white/10 px-6 py-4 shadow-2xl backdrop-blur-xl transition-all">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-black text-white shadow-lg shadow-blue-500/20">
          D
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            devcodstore
          </h1>
          <p className="text-xs text-gray-400">
            Kod, proje ve web sistemleri pazarı
          </p>
        </div>
      </Link>

      <div className="hidden items-center gap-4 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href === "/products" ? `/products?refresh=${refreshToken}` : link.href}
            className="text-sm font-medium text-gray-300 hover:text-white"
          >
            {link.label}
          </Link>
        ))}

        {user && (
          <Link
            href="/notifications"
            className="rounded-2xl border border-yellow-500/30 px-5 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/10"
          >
            🔔 Bildirimler {notificationCount > 0 ? `(${notificationCount})` : ""}
          </Link>
        )}

        <Link
          href="/cart"
          className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/10"
        >
          🛒 Sepet {cartCount > 0 ? `(${cartCount})` : ""}
        </Link>

        {user ? (
          <Link
            href="/account"
            className="rounded-2xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-500"
          >
            Hesabım
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Giriş Yap
          </Link>
        )}

        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-2xl border border-purple-500/30 px-5 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/10"
          >
            Admin
          </Link>
        )}
      </div>

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold md:hidden"
      >
        {menuOpen ? "Kapat" : "☰ Menü"}
      </button>

      {menuOpen && (
        <div className="absolute left-0 right-0 top-20 z-50 rounded-3xl border border-white/10 bg-[#0B1020] p-4 shadow-2xl md:hidden">
          <div className="grid gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href === "/products" ? `/products?refresh=${refreshToken}` : link.href}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200"
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <Link
                href="/notifications"
                className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-yellow-300"
              >
                🔔 Bildirimler {notificationCount > 0 ? `(${notificationCount})` : ""}
              </Link>
            )}

            <Link
              href="/cart"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200"
            >
              🛒 Sepet {cartCount > 0 ? `(${cartCount})` : ""}
            </Link>

            {user ? (
              <Link
                href="/account"
                className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Hesabım
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black"
              >
                Giriş Yap
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-300"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
