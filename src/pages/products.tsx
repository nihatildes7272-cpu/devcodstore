import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  status: string;
  description: string | null;
  created_at?: string;
};

const categories = ["Tümü", "Web Site", "Dashboard", "Frontend", "Mobile UI"];

const sortOptions = [
  { value: "newest", label: "En Yeni" },
  { value: "price_low", label: "En Düşük Fiyat" },
  { value: "price_high", label: "En Yüksek Fiyat" },
  { value: "title_az", label: "A-Z" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [sortBy, setSortBy] = useState("newest");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setMessage("");

      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "Yayında")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage("Ürünler yüklenirken hata oluştu: " + error.message);
        setProducts([]);
      } else {
        setProducts(data || []);
      }

      setLoading(false);
    }

    loadPage();
  }, []);

  function parsePrice(price: string) {
    const numberText = price.replace(/[^\d]/g, "");
    return Number(numberText || 0);
  }

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const searchText = `${product.title} ${product.seller} ${product.category} ${
        product.description || ""
      }`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "Tümü" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "price_low") {
        return parsePrice(a.price) - parsePrice(b.price);
      }

      if (sortBy === "price_high") {
        return parsePrice(b.price) - parsePrice(a.price);
      }

      if (sortBy === "title_az") {
        return a.title.localeCompare(b.title, "tr");
      }

      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;

      return dateB - dateA;
    });
  }, [products, search, selectedCategory, sortBy]);

  function clearFilters() {
    setSearch("");
    setSelectedCategory("Tümü");
    setSortBy("newest");
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Tüm Ürünler</h2>
              <p className="mt-2 text-gray-400">
                Kod paketleri, paneller, arayüzler ve hazır web sistemleri.
              </p>
            </div>

            <div className="rounded-2xl bg-black/30 px-5 py-3 text-sm text-gray-300">
              Yayındaki ürün:{" "}
              <span className="font-bold text-white">{products.length}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ürün, satıcı, açıklama veya kategori ara..."
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

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={clearFilters}
              className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10"
            >
              Temizle
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            Ürünler yükleniyor...
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-2 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
              <p>Gösterilen ürün sayısı: {filteredProducts.length}</p>

              {(search || selectedCategory !== "Tümü" || sortBy !== "newest") && (
                <p>
                  Aktif filtre:{" "}
                  <span className="text-white">
                    {selectedCategory} /{" "}
                    {sortOptions.find((option) => option.value === sortBy)?.label}
                  </span>
                </p>
              )}
            </div>

            <section className="grid gap-6 md:grid-cols-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-blue-500/40 hover:bg-white/[0.07]"
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

                      {product.description && (
                        <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-400">
                          {product.description}
                        </p>
                      )}
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
                  Farklı bir kelime, kategori veya sıralama deneyebilirsin.
                </p>

                <button
                  onClick={clearFilters}
                  className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
                >
                  Filtreleri Temizle
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
