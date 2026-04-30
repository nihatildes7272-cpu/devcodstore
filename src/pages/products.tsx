import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import { productCategoryFilters } from "@/lib/productCategories";
import { productLicenses } from "@/lib/productLicenses";
import { productPreviewTypes } from "@/lib/productPreviewTypes";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  seller_id: string | null;
  status: string;
  description: string | null;
  image_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  license_type?: string | null;
  preview_type?: string | null;
  security_status?: string | null;
  tags?: string[] | null;
  created_at?: string;
};

type ProductsPageProps = {
  initialProducts: Product[];
  initialError: string;
};

const sortOptions = [
  { value: "newest", label: "En Yeni" },
  { value: "price_low", label: "En Düşük Fiyat" },
  { value: "price_high", label: "En Yüksek Fiyat" },
  { value: "title_az", label: "A-Z" },
];

const fileTypeFilters = [
  "Tümü",
  "ZIP Proje Dosyası",
  "PDF Doküman",
  "Ders Slaytı / Sunum",
  "Word Dokümanı",
  "Excel Dosyası",
  "Görsel Dosyası",
  "JSON Dosyası",
  "Dijital Dosya",
];

const securityFilters = [
  "Tümü",
  "Güvenli",
  "Manuel İnceleme",
  "Taranmadı",
  "Riskli",
];

const previewFilters = [
  "Tümü",
  ...productPreviewTypes.map((item) => item.type),
];

const licenseFilters = [
  "Tümü",
  ...productLicenses.map((item) => item.type),
];

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 15000,
  message = "Sunucu yanıtı gecikti."
): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export default function ProductsPage({
  initialProducts,
  initialError,
}: ProductsPageProps) {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [sortBy, setSortBy] = useState("newest");

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState("Tümü");
  const [selectedSecurity, setSelectedSecurity] = useState("Tümü");
  const [selectedLicense, setSelectedLicense] = useState("Tümü");
  const [selectedPreview, setSelectedPreview] = useState("Tümü");

  const [message, setMessage] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadProducts(showRefreshing = true) {
    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      const result = await withTimeout(
        supabase
          .from("products")
          .select(
            "id,title,category,price,seller,seller_id,status,description,created_at,image_url,file_type,file_name,license_type,preview_type,security_status,tags"
          )
          .eq("status", "Yayında")
          .order("created_at", { ascending: false })
          .limit(100),
        15000,
        "Ürünler yenilenirken sunucu geç cevap verdi."
      );

      if (result.error) {
        setMessage("Ürünler yenilenemedi: " + result.error.message);
      } else {
        setProducts(result.data || []);
        setMessage("");
        setLastUpdated(
          new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ürünler yenilenirken bilinmeyen bir hata oluştu."
      );
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (typeof router.query.search === "string") {
      setSearch(router.query.search);
    }
  }, [router.query.search]);

  useEffect(() => {
    const channel = supabase
      .channel("products-live-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          loadProducts(false);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      loadProducts(false);
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  function parsePrice(price: string) {
    const numberText = price.replace(/[^\d]/g, "");
    return Number(numberText || 0);
  }

  function clearFilters() {
    setSearch("");
    setSelectedCategory("Tümü");
    setSortBy("newest");
    setSelectedFileType("Tümü");
    setSelectedSecurity("Tümü");
    setSelectedLicense("Tümü");
    setSelectedPreview("Tümü");
  }

  const activeAdvancedCount = [
    selectedFileType !== "Tümü",
    selectedSecurity !== "Tümü",
    selectedLicense !== "Tümü",
    selectedPreview !== "Tümü",
  ].filter(Boolean).length;

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const searchText = `${product.title} ${product.seller} ${product.category} ${
        product.description || ""
      } ${(product.tags || []).join(" ")} ${product.file_type || ""} ${
        product.license_type || ""
      } ${product.preview_type || ""} ${product.security_status || ""}`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "Tümü" || product.category === selectedCategory;

      const matchesFileType =
        selectedFileType === "Tümü" || product.file_type === selectedFileType;

      const matchesSecurity =
        selectedSecurity === "Tümü" ||
        (product.security_status || "Taranmadı") === selectedSecurity;

      const matchesLicense =
        selectedLicense === "Tümü" || product.license_type === selectedLicense;

      const matchesPreview =
        selectedPreview === "Tümü" || product.preview_type === selectedPreview;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesFileType &&
        matchesSecurity &&
        matchesLicense &&
        matchesPreview
      );
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
  }, [
    products,
    search,
    selectedCategory,
    selectedFileType,
    selectedSecurity,
    selectedLicense,
    selectedPreview,
    sortBy,
  ]);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Tüm Ürünler</h2>
              <p className="mt-2 text-gray-400">
                Kod paketleri, PDF dosyaları, slaytlar, şablonlar ve dijital ürünler.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <div className="rounded-2xl bg-black/30 px-5 py-3 text-sm text-gray-300">
                Yayındaki ürün:{" "}
                <span className="font-bold text-white">{products.length}</span>
              </div>

              <div className="text-xs text-gray-500">
                {refreshing
                  ? "Canlı yenileniyor..."
                  : lastUpdated
                  ? `Son güncelleme: ${lastUpdated}`
                  : "Canlı takip aktif"}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ürün, satıcı, etiket, açıklama veya dosya türü ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500"
            />

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none"
            >
              {productCategoryFilters.map((category) => (
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
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="rounded-2xl border border-blue-500/30 px-5 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/10"
            >
              Gelişmiş Filtreler
              {activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ""}
            </button>
          </div>

          {advancedOpen && (
            <section className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <label className="grid gap-2 text-sm text-gray-400">
                  Dosya Türü
                  <select
                    value={selectedFileType}
                    onChange={(event) => setSelectedFileType(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  >
                    {fileTypeFilters.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-gray-400">
                  Güvenlik
                  <select
                    value={selectedSecurity}
                    onChange={(event) => setSelectedSecurity(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  >
                    {securityFilters.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-gray-400">
                  Lisans
                  <select
                    value={selectedLicense}
                    onChange={(event) => setSelectedLicense(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  >
                    {licenseFilters.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-gray-400">
                  Önizleme
                  <select
                    value={selectedPreview}
                    onChange={(event) => setSelectedPreview(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  >
                    {previewFilters.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          )}
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{message}</p>

            <button
              onClick={() => loadProducts(true)}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <div className="mb-5 flex flex-col gap-2 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
          <p>Gösterilen ürün sayısı: {filteredProducts.length}</p>

          <div className="flex flex-wrap gap-3">
            {(search ||
              selectedCategory !== "Tümü" ||
              sortBy !== "newest" ||
              activeAdvancedCount > 0) && (
              <button
                onClick={clearFilters}
                className="text-blue-300 hover:text-blue-200"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-blue-500/40 hover:bg-white/[0.07]"
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="h-56 w-full object-cover"
                />
              ) : (
                <div className="flex h-56 w-full items-center justify-center bg-black/30 text-gray-500">
                  Görsel yok
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                      {product.category}
                    </span>

                    <h2 className="mt-5 text-2xl font-bold">{product.title}</h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Satıcı:{" "}
                      {product.seller_id ? (
                        <a
                          href={`/seller-store/${product.seller_id}`}
                          className="text-blue-300 hover:text-blue-200"
                        >
                          {product.seller}
                        </a>
                      ) : (
                        <span>{product.seller}</span>
                      )}
                    </p>

                    {product.description && (
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-400">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {product.file_type && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                          {product.file_type}
                        </span>
                      )}

                      {product.security_status && (
                        <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-300">
                          Güvenlik: {product.security_status}
                        </span>
                      )}

                      {product.license_type && (
                        <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
                          {product.license_type}
                        </span>
                      )}
                    </div>

                    {Array.isArray(product.tags) && product.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {product.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
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
            </div>
          ))}
        </section>

        {filteredProducts.length === 0 && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <h3 className="text-2xl font-bold">Ürün bulunamadı</h3>
            <p className="mt-2 text-gray-400">
              Arama veya filtrelere uygun yayında ürün bulunamadı.
            </p>

            <button
              onClick={clearFilters}
              className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<ProductsPageProps> = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      props: {
        initialProducts: [],
        initialError:
          "Supabase bağlantı bilgileri eksik. Vercel Environment Variables kontrol edilmeli.",
      },
    };
  }

  const serverSupabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await serverSupabase
    .from("products")
    .select(
      "id,title,category,price,seller,seller_id,status,description,created_at,image_url,file_type,file_name,license_type,preview_type,security_status,tags"
    )
    .eq("status", "Yayında")
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    props: {
      initialProducts: data || [],
      initialError: error ? "Ürünler yüklenemedi: " + error.message : "",
    },
  };
};
