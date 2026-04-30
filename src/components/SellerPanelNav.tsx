import { useRouter } from "next/router";

const links = [
  { href: "/seller", label: "Özet" },
  { href: "/seller/new", label: "Yeni Ürün Yükle" },
  { href: "/seller/products", label: "Ürünlerim" },
  { href: "/seller/sales", label: "Satışlarım" },
];

export default function SellerPanelNav() {
  const router = useRouter();

  return (
    <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        {links.map((link) => {
          const active = router.pathname === link.href;

          return (
            <a
              key={link.href}
              href={link.href}
              className={
                active
                  ? "rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white"
                  : "rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-semibold text-gray-300 hover:bg-white/10"
              }
            >
              {link.label}
            </a>
          );
        })}
      </div>
    </section>
  );
}
