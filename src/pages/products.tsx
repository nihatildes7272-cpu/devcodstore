import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const products = [
  {
    id: "1",
    title: "Modern E-Ticaret Sitesi",
    category: "Web Site",
    price: "₺1.499",
    seller: "NCS Studio",
    status: "Yayında",
  },
  {
    id: "2",
    title: "Admin Panel Paketi",
    category: "Dashboard",
    price: "₺899",
    seller: "CodeMarket",
    status: "Yayında",
  },
  {
    id: "3",
    title: "Portfolio Scripti",
    category: "Frontend",
    price: "₺499",
    seller: "DevCraft",
    status: "İnceleniyor",
  },
  {
    id: "4",
    title: "Mobil Uygulama Arayüzü",
    category: "Mobile UI",
    price: "₺699",
    seller: "AppForge",
    status: "Yayında",
  },
];

const categories = ["Tümü", "Web Site", "Dashboard", "Frontend", "Mobile UI"];

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }

    getSession();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(search.toLowerCase()) ||
      product.seller.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "Tümü" || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore Ürünler</h1>
            <p className="text-sm text-gray-400">
              Satışa sunulan kod ve proje paketleri
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Ana Sayfa
            </a>

            {user ? (
              <a
                href="/account"
                className="rounded-2xl bg-green-600 px-5 py-2 text-sm font-semibold text-white"
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
          </div>
        </nav>

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-3xl font-bold">Tüm Ürünler</h2>
          <p className="mt-2 text-gray-400">
            Kod paketleri, paneller, arayüzler ve hazır web sistemleri.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ürün, satıcı veya kategori ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500"
            />

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none"
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
        </section>

        <div className="mb-5 text-sm text-gray-400">
          Gösterilen ürün sayısı: {filteredProducts.length}
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                    {product.category}
                  </span>

                  <h2 className="mt-5 text-2xl font-bold">{product.title}</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    Satıcı: {product.seller}
                  </p>
                </div>

                <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300">
                  {product.status}
                </span>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <p className="text-3xl font-bold">{product.price}</p>

                <a
                  href={`/product/${product.id}`}
                  className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
                >
                  İncele
                </a>
              </div>
            </div>
          ))}
        </section>

        {filteredProducts.length === 0 && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <h3 className="text-2xl font-bold">Ürün bulunamadı</h3>
            <p className="mt-2 text-gray-400">
              Farklı bir kelime ya da kategori deneyebilirsin.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
