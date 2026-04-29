import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function SiteNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);

  function loadCartCount() {
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
    }

    loadUser();
    loadCartCount();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    window.addEventListener("storage", loadCartCount);
    window.addEventListener("devcodstore-cart-updated", loadCartCount);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("storage", loadCartCount);
      window.removeEventListener("devcodstore-cart-updated", loadCartCount);
    };
  }, []);

  const links = [
    { href: "/products", label: "Ürünler" },
    { href: "/seller", label: "Satıcı Ol" },
    { href: "/library", label: "Dosyalarım" },
    { href: "/about", label: "Hakkımızda" },
    { href: "/contact", label: "İletişim" },
  ];

  return (
    <nav className="relative mb-10 flex items-center justify-between gap-6">
      <a href="/" className="block">
        <h1 className="text-2xl font-bold">devcodstore</h1>
        <p className="text-sm text-gray-400">
          Kod, proje ve web sistemleri pazarı
        </p>
      </a>

      <div className="hidden items-center gap-4 md:flex">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-gray-300 hover:text-white"
          >
            {link.label}
          </a>
        ))}

        <a
          href="/cart"
          className="relative rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/10"
        >
          🛒 Sepet
          {cartCount > 0 && (
            <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
              {cartCount}
            </span>
          )}
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

        <a
          href="/admin"
          className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Admin
        </a>
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

            <a
              href="/admin"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200"
            >
              Admin
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
