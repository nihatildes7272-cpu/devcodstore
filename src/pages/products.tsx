import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
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

const pageSize = 12;

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

const previewFilters = ["Tümü", ...productPreviewTypes.map((item) => item.type)];
const licenseFilters = ["Tümü", ...productLicenses.map((item) => item.type)];

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 15000,
  message = "Ürünler yüklenirken sunucu geç cevap verdi."
): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function normalizeSearch(input: string) {
  return input.trim().replaceAll(",", " ").replace(/\s+/g, " ");
}

export default function ProductsPage() {
  const router = useRouter();
  const mountedRef = useRef(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [sortBy, setSortBy] = useState("newest");

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState("Tümü");
  const [selectedSecurity, setSelectedSecurity] = useState("Tümü");
  const [selectedLicense, setSelectedLicense] = useState("Tümü");
  const [selectedPreview, setSelectedPreview] = useState("Tümü");

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [debugText, setDebugText] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const activeAdvancedCount = [
    selectedFileType !== "Tümü",
    selectedSecurity !== "Tümü",
    selectedLicense !== "Tümü",
    selectedPreview !== "Tümü",
  ].filter(Boolean).length;

  async function loadProducts(targetPage = page, showMainLoading = true) {
    if (showMainLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");
    setDebugText("Ürünler sorgulanıyor...");

    const hardStop = setTimeout(() => {
      if (!mountedRef.current) return;

      setLoading(false);
      setRefreshing(false);
      setMessage("Ürünler yüklenirken işlem uzun sürdü. Lütfen Tekrar Dene butonuna bas.");
      setDebugText("15 saniyelik güvenlik süresi doldu.");
    }, 16000);

    try {
      const cleanSearch = normalizeSearch(search);

      const result = await withTimeout(
        supabase.rpc("search_products_paginated", {
          p_search: cleanSearch,
          p_category: selectedCategory,
          p_file_type: selectedFileType,
          p_security_status: selectedSecurity,
          p_license_type: selectedLicense,
          p_preview_type: selectedPreview,
          p_sort: sortBy,
          p_page: targetPage,
          p_page_size: pageSize,
        }),
        15000,
        "Ürünler yüklenirken sunucu geç cevap verdi."
      );

      if (!mountedRef.current) return;

      if (result.error) {
        setProducts([]);
        setTotalCount(0);
        setMessage("Ürünler yüklenemedi: " + result.error.message);
        setDebugText("Ürün sorgusunda hata oluştu.");
        return;
      }

      const rows = (result.data || []) as Array<Product & { total_count?: number }>;
      const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;

      const productData = rows.map((row) => {
        const { total_count, ...product } = row;
        return product;
      });

      setProducts(productData);
      setTotalCount(total);
      setMessage("");
      setDebugText("Ürünler başarıyla yüklendi.");
      setLastUpdated(
        new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (error) {
      if (!mountedRef.current) return;

      setProducts([]);
      setTotalCount(0);
      setMessage(
        error instanceof Error
          ? error.message
          : "Ürünler yüklenirken bilinmeyen bir hata oluştu."
      );
      setDebugText("Beklenmeyen hata oluştu.");
    } finally {
      clearTimeout(hardStop);

      if (!mountedRef.current) return;

      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    if (typeof router.query.search === "string") {
      setSearch(router.query.search);
      setPage(1);
    }
  }, [router.isReady, router.query.search]);

  useEffect(() => {
    if (!router.isReady) return;

    if (typeof router.query.refresh === "string") {
      setPage(1);
      loadProducts(1, true);
    }
  }, [router.isReady, router.query.refresh]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(page, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    page,
    search,
    selectedCategory,
    sortBy,
    selectedFileType,
    selectedSecurity,
    selectedLicense,
    selectedPreview,
  ]);

  function clearFilters() {
    setSearch("");
    setSelectedCategory("Tümü");
    setSortBy("newest");
    setSelectedFileType("Tümü");
    setSelectedSecurity("Tümü");
    setSelectedLicense("Tümü");
    setSelectedPreview("Tümü");
    setPage(1);
  }

  const visibleRange = useMemo(() => {
    if (totalCount === 0) return "0";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalCount);
    return `${start}-${end}`;
  }, [page, totalCount]);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-transparent p-8 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-4xl font-black tracking-tight">Tüm Ürünler</h2>
              <p className="mt-3 text-gray-300">
                Kod paketleri, PDF dosyaları, slaytlar, şablonlar ve dijital ürünler.
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                Durum: {debugText || "Hazırlanıyor..."}
              </p>
            </div>

            <div className="flex flex-col gap-4 md:items-end">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-gray-300 backdrop-blur-sm">
                  Toplam ürün: <span className="font-black text-white ml-1">{totalCount}</span>
                </div>
              <button
                onClick={() => loadProducts(page, false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 hover:bg-blue-500"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>
              </div>

              <div className="text-xs font-medium text-gray-500">
                {lastUpdated ? `Son güncelleme: ${lastUpdated}` : "Sayfalı ürün sistemi aktif"}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Ürün, satıcı, etiket, açıklama veya dosya türü ara..."
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white outline-none placeholder:text-gray-600 focus:border-blue-500/50 transition-all"
            />

            <select
              value={selectedCategory}
              onChange={(event) => {
                setSelectedCategory(event.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
            >
              {productCategoryFilters.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-bold text-blue-300 transition-all hover:scale-105 active:scale-95 hover:bg-blue-500/20"
            >
              Gelişmiş Filtreler
              {activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ""}
            </button>
          </div>

          {advancedOpen && (
            <section className="mt-5 rounded-3xl border border-white/5 bg-black/20 p-6 shadow-inner">
              <div className="grid gap-4 md:grid-cols-4">
                <label className="grid gap-2 text-sm text-gray-400">
                  <span className="font-bold text-gray-300">Dosya Türü</span>
                  <select
                    value={selectedFileType}
                    onChange={(event) => {
                      setSelectedFileType(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                  >
                    {fileTypeFilters.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-gray-400">
                  <span className="font-bold text-gray-300">Güvenlik</span>
                  <select
                    value={selectedSecurity}
                    onChange={(event) => {
                      setSelectedSecurity(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                  >
                    {securityFilters.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-gray-400">
                  <span className="font-bold text-gray-300">Lisans</span>
                  <select
                    value={selectedLicense}
                    onChange={(event) => {
                      setSelectedLicense(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                  >
                    {licenseFilters.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-gray-400">
                  <span className="font-bold text-gray-300">Önizleme</span>
                  <select
                    value={selectedPreview}
                    onChange={(event) => {
                      setSelectedPreview(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
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
              onClick={() => loadProducts(page, true)}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <div className="mb-5 flex flex-col gap-2 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
          <p>
            Gösterilen: {visibleRange} / {totalCount}
          </p>

          {(search ||
            selectedCategory !== "Tümü" ||
            sortBy !== "newest" ||
            activeAdvancedCount > 0) && (
            <button onClick={clearFilters} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-blue-300 transition-all hover:bg-white/10 hover:text-blue-200">
              ✕ Filtreleri Temizle
            </button>
          )}
        </div>

        {loading ? (
          <section className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 py-24 text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-xl font-bold">Ürünler aranıyor...</p>
            <p className="mt-3 text-sm text-gray-500">
              {debugText || "Ürün sorgusu hazırlanıyor."}
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/30 hover:bg-white/[0.08] hover:shadow-2xl hover:shadow-blue-500/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  <div className="relative">
                  {product.image_url ? (
                    <div className="h-52 w-full overflow-hidden rounded-2xl">
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-52 w-full items-center justify-center rounded-2xl bg-black/30 text-gray-500">
                      Görsel yok
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                          {product.category}
                        </span>

                        <h2 className="mt-5 text-2xl font-black tracking-tight transition-colors group-hover:text-blue-300">{product.title}</h2>

                        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
                          <span className="text-base">👨‍💻</span>{" "}
                          {product.seller_id ? (
                            <a
                              href={`/seller-store/${product.seller_id}`}
                              className="font-medium text-gray-300 transition-colors hover:text-blue-400"
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
                      </div>

                      <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">
                        {product.status}
                      </span>
                    </div>

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

                    <div className="mt-8 flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Fiyat</span>
                        <p className="text-3xl font-black text-white">{product.price}</p>
                      </div>

                      <a
                        href={`/product/${product.id}`}
                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
                      >
                        İncele
                      </a>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </section>

            {products.length === 0 && (
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

            <section className="mt-10 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-400">
                Sayfa {page} / {totalPages}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                >
                  Önceki
                </button>

                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
