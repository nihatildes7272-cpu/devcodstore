import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Ürünler" },
  { href: "/admin/orders", label: "Siparişler" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/reports", label: "Raporlar" },
  { href: "/admin/reviews", label: "Yorumlar" },
  { href: "/admin/support", label: "Destek" },
  { href: "/admin/logs", label: "İşlem Kayıtları" },
  { href: "/admin/sellers", label: "Satıcılar" },
  { href: "/notifications", label: "Bildirimler" },
];

export default function AdminNavbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const currentPage =
    adminLinks.find((link) => link.href === router.pathname)?.label || "Admin";

  return (
    <nav className="relative mb-10 rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-5">
        <a href="/admin" className="block">
          <h1 className="text-2xl font-black tracking-tight text-white">
            devcodstore Admin
          </h1>
          <p className="text-xs text-gray-400">
            Şu an: {currentPage}
          </p>
        </a>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
        >
          {menuOpen ? "Kapat" : "☰ Admin Menü"}
        </button>
      </div>

      {menuOpen && (
        <div className="absolute left-0 right-0 top-24 z-50 rounded-3xl border border-white/10 bg-[#0B1020] p-5 shadow-2xl">
          <div className="grid gap-3 md:grid-cols-3">
            {adminLinks.map((link) => {
              const isActive = router.pathname === link.href;

              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={
                    isActive
                      ? "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                      : "rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-white/10"
                  }
                >
                  {link.label}
                </a>
              );
            })}

            <a
              href="/"
              className="rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-300 hover:bg-green-500/20"
            >
              Siteye Dön
            </a>

            <a
              href="/account"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-white/10"
            >
              Hesabım
            </a>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-left text-sm font-semibold text-red-300 hover:bg-red-500/20"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
