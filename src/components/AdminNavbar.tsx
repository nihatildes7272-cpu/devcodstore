import Link from "next/link";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

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
        <div>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={() => setMenuOpen(false)}
          />
          {/* Menu */}
          <div className="fixed left-6 right-6 top-32 z-[9999] rounded-3xl border border-white/30 bg-gradient-to-b from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-3">
            {adminLinks.map((link) => {
              const isActive = router.pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={
                    isActive
                      ? "rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg transform scale-105 border border-blue-500/50 animate-pulse"
                      : "rounded-2xl border border-white/30 bg-gradient-to-r from-white/5 to-white/10 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-white/20 hover:border-white/50 hover:scale-105 transition-all duration-200 backdrop-blur-sm"
                  }
                >
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="rounded-2xl border border-green-500/40 bg-gradient-to-r from-green-500/10 to-green-600/10 px-5 py-3 text-sm font-semibold text-green-300 hover:bg-green-500/20 hover:border-green-500/60 hover:scale-105 transition-all duration-200 backdrop-blur-sm"
            >
              🏠 Siteye Dön
            </Link>

            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="rounded-2xl border border-white/30 bg-gradient-to-r from-white/5 to-white/10 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-white/20 hover:border-white/50 hover:scale-105 transition-all duration-200 backdrop-blur-sm"
            >
              👤 Hesabım
            </Link>

            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-500/10 to-red-600/10 px-5 py-3 text-left text-sm font-semibold text-red-300 hover:bg-red-500/20 hover:border-red-500/60 hover:scale-105 transition-all duration-200 backdrop-blur-sm"
            >
              🚪 Çıkış Yap
            </button>
          </div>
          </div>
        </div>
      )}
    </nav>
  );
}
