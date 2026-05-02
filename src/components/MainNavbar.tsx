import Link from "next/link";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";

type MainNavbarProps = {
  user: User | null;
};

export default function MainNavbar({ user }: MainNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/products", label: "Ürünler" },
    { href: "/seller", label: "Satıcı Ol" },
    { href: "/about", label: "Hakkımızda" },
    { href: "/contact", label: "İletişim" },
  ];

  return (
    <nav className="relative flex items-center justify-between gap-6">
      <Link href="/" className="block">
        <h1 className="text-2xl font-bold">devcodstore</h1>
        <p className="text-sm text-gray-400">
          Kod, proje ve web sistemleri pazarı
        </p>
      </Link>

      <div className="hidden items-center gap-4 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-gray-300 hover:text-white"
          >
            {link.label}
          </Link>
        ))}

        {user ? (
          <Link
            href="/account"
            className="rounded-2xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-500"
          >
            Hesabım
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm text-gray-300 hover:text-white">
              Giriş Yap
            </Link>

            <Link href="/register" className="text-sm text-gray-300 hover:text-white">
              Kayıt Ol
            </Link>
          </>
        )}

        <Link
          href="/admin"
          className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
        >
          Admin
        </Link>
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
                href={link.href}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200"
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <Link
                href="/account"
                className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Hesabım
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200"
                >
                  Giriş Yap
                </Link>

                <Link
                  href="/register"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200"
                >
                  Kayıt Ol
                </Link>
              </>
            )}

            <Link
              href="/admin"
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black"
            >
              Admin
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
