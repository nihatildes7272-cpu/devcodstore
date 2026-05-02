import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Ürünler" },
  { href: "/admin/orders", label: "Siparişler" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/seller-applications", label: "Satıcı Başvuruları" },
  { href: "/admin/reports", label: "Raporlar" },
  { href: "/admin/reviews", label: "Yorumlar" },
  { href: "/admin/support", label: "Destek" },
  { href: "/admin/logs", label: "İşlem Kayıtları" },
  { href: "/admin/download-logs", label: "İndirme Geçmişi" },
  { href: "/admin/rate-limits", label: "Rate Limit" },
  { href: "/admin/system-health", label: "Sistem Sağlığı" },
  { href: "/admin/maintenance", label: "Sistem Bakımı" },
  { href: "/admin/scan-jobs", label: "Tarama Kuyruğu" },
  { href: "/admin/scan-repair", label: "Tarama Repair" },
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
    <nav className="relative mb-10 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between gap-5">
        <Link href="/admin" className="block group">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">
            devcodstore Admin
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            Şu an: <span className="text-blue-400 font-medium">{currentPage}</span>
          </p>
        </Link>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-600 shadow-lg transition-all duration-200"
        >
          {menuOpen ? "✕ Kapat" : "☰ Admin Menü"}
        </button>
      </div>

      {menuOpen && (
        <div className="absolute left-0 right-0 top-28 z-50 rounded-3xl border border-white/20 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl p-6 shadow-2xl">
          <div className="grid gap-4 md:grid-cols-3">
            {adminLinks.map((link) => {
              const isActive = router.pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    isActive
                      ? "rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg transform scale-105"
                      : "rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:border-white/30 transition-all duration-200"
                  }
                >
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/"
              className="rounded-2xl border border-green-500/40 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-300 hover:bg-green-500/20 hover:border-green-500/60 transition-all duration-200"
            >
              🏠 Siteye Dön
            </Link>

            <Link
              href="/account"
              className="rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:border-white/30 transition-all duration-200"
            >
              👤 Hesabım
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-3 text-left text-sm font-semibold text-red-300 hover:bg-red-500/20 hover:border-red-500/60 transition-all duration-200"
            >
              🚪 Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
