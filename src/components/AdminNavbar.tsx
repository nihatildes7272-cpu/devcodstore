import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Ürünler" },
  { href: "/admin/orders", label: "Siparişler" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/reports", label: "Raporlar" },
  { href: "/admin/sellers", label: "Satıcılar" },
];

export default function AdminNavbar() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="relative mb-10 rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <a href="/admin" className="block">
          <h1 className="text-2xl font-black tracking-tight text-white">
            devcodstore Admin
          </h1>
          <p className="text-xs text-gray-400">
            Ürün, sipariş, kullanıcı ve platform yönetimi
          </p>
        </a>

        <div className="flex flex-wrap gap-3">
          {adminLinks.map((link) => {
            const isActive = router.pathname === link.href;

            return (
              <a
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
                }
              >
                {link.label}
              </a>
            );
          })}

          <a
            href="/"
            className="rounded-2xl border border-green-500/30 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/10"
          >
            Siteye Dön
          </a>

          <a
            href="/account"
            className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
          >
            Hesabım
          </a>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </nav>
  );
}
