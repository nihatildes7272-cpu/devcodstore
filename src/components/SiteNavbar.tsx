import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function SiteNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);

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
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;

        setUser(currentUser);
        await checkAdmin(currentUser);
        await loadCartCount(currentUser);
      }
    );

    async function refreshCart() {
      const { data } = await supabase.auth.getUser();
      await loadCartCount(data.user);
    }

    window.addEventListener("storage", refreshCart);
    window.addEventListener("devcodstore-cart-updated", refreshCart);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("storage", refreshCart);
      window.removeEventListener("devcodstore-cart-updated", refreshCart);
    };
  }, []);

  const links = [
    { href: "/products", label: "Ürünler" },
    { href: "/seller", label: "Satıcı Ol" },
    { href: "/library", label: "Dosyalarım" },
    { href: "/about", label: "Hakkımızda" },
    { href: "/contact", label: "İletişim" },
    { href: "/yasal", label: "Yasal" },
  ];

  return (
    <nav className="relative mb-10 flex items-center justify-between gap-6 rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
      <a href="/" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
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
      </a>

      <div className="hidden items-center gap-4 md:flex">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-gray-300 hover:text-white"
          >
            {link.label}
          </a>
        ))}

        <a
          href="/cart"
          className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/10"
        >
          🛒 Sepet {cartCount > 0 ? `(${cartCount})` : ""}
        </a>

        {user ? (
          <a
            href="/account"
            className="rounded-2xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-500"
          >
            Hesabım
          </a>
        ) : (
          <a
            href="/login"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Giriş Yap
          </a>
        )}

        {isAdmin && (
          <a
            href="/admin"
            className="rounded-2xl border border-purple-500/30 px-5 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/10"
          >
            Admin
          </a>
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
              <a
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200"
              >
                {link.label}
              </a>
            ))}

            <a
              href="/cart"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200"
            >
              🛒 Sepet {cartCount > 0 ? `(${cartCount})` : ""}
            </a>

            {user ? (
              <a
                href="/account"
                className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Hesabım
              </a>
            ) : (
              <a
                href="/login"
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black"
              >
                Giriş Yap
              </a>
            )}

            {isAdmin && (
              <a
                href="/admin"
                className="rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-300"
              >
                Admin
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
