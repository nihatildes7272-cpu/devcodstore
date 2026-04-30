import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type ScanIssue = {
  level: "low" | "medium" | "high" | "critical";
  file: string;
  message: string;
};

type ScanReport = {
  checkedFiles?: number;
  scannedTextFiles?: number;
  issues?: ScanIssue[];
  summary?: string;
};

type Product = {
  id: string;
  title: string;
  seller: string;
  seller_id: string | null;
  category: string;
  price: string;
  status: string;
  description: string | null;
  file_path?: string | null;
  security_status?: string | null;
  security_note?: string | null;
  security_checked_at?: string | null;
  security_scan_score?: number | null;
  security_scan_report?: ScanReport | null;
  security_scanned_at?: string | null;
  license_type?: string | null;
  license_summary?: string | null;
  license_allows_commercial?: boolean | null;
  license_allows_resale?: boolean | null;
  strong_scan_status?: string | null;
  strong_scan_job_id?: string | null;
  strong_scan_started_at?: string | null;
  strong_scan_finished_at?: string | null;
  created_at?: string;
};

type ProductTab =
  | "Onay Bekliyor"
  | "Yayında"
  | "Reddedildi"
  | "Yayından Kaldırıldı"
  | "Tümü";

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

const tabs: { key: ProductTab; label: string }[] = [
  { key: "Onay Bekliyor", label: "Onay Bekleyen" },
  { key: "Yayında", label: "Yayında" },
  { key: "Reddedildi", label: "Reddedildi" },
  { key: "Yayından Kaldırıldı", label: "Yayından Kaldırıldı" },
  { key: "Tümü", label: "Tüm Ürünler" },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<ProductTab>("Onay Bekliyor");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [scanningProductId, setScanningProductId] = useState<string | null>(null);
  const [queuingStrongScanProductId, setQueuingStrongScanProductId] = useState<string | null>(null);
  const [openReportProductId, setOpenReportProductId] = useState<string | null>(null);

  async function loadProducts(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const result = await withTimeout(
        supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false }),
        15000,
        "Ürünler yüklenirken sunucu geç cevap verdi."
      );

      if (result.error) {
        setMessage("Ürünler yüklenirken hata oluştu: " + result.error.message);
        setProducts([]);
      } else {
        setProducts(result.data || []);
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
          : "Ürünler yüklenirken bilinmeyen bir hata oluştu."
      );
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadProducts(true);

    const channel = supabase
      .channel("admin-products-live")
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
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function queueStrongScan(productId: string) {
    setMessage("");

    const targetProduct = products.find((item) => item.id === productId);

    if (!targetProduct?.file_path) {
      setMessage("Bu üründe ZIP dosyası yok. Güçlü tarama yapılamaz.");
      return;
    }

    setQueuingStrongScanProductId(productId);

    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setMessage("Güçlü tarama için admin oturumu bulunamadı.");
        setQueuingStrongScanProductId(null);
        return;
      }

      const { data: jobData, error: jobError } = await supabase
        .from("security_scan_jobs")
        .insert({
          product_id: productId,
          requested_by: userData.user.id,
          status: "queued",
          scan_type: "full",
          priority: 5,
          report: {
            message: "Güçlü tarama kuyruğa alındı. Scanner Worker çalışınca işlenecek.",
          },
        })
        .select("id")
        .single();

      if (jobError || !jobData) {
        setMessage("Güçlü tarama kuyruğa alınamadı: " + (jobError?.message || ""));
        setQueuingStrongScanProductId(null);
        return;
      }

      const { error: productError } = await supabase
        .from("products")
        .update({
          strong_scan_status: "queued",
          strong_scan_job_id: jobData.id,
          security_note: "Ürün güçlü güvenlik tarama kuyruğuna alındı.",
        })
        .eq("id", productId);

      if (productError) {
        setMessage("Ürün güçlü tarama durumuna alınamadı: " + productError.message);
        setQueuingStrongScanProductId(null);
        return;
      }

      setMessage("Ürün güçlü tarama kuyruğuna alındı.");
      await loadProducts(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? "Güçlü tarama kuyruğu hatası: " + error.message
          : "Güçlü tarama kuyruğunda bilinmeyen hata oluştu."
      );
    } finally {
      setQueuingStrongScanProductId(null);
    }
  }

  async function scanProduct(productId: string) {
    setMessage("");
    setScanningProductId(productId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setMessage("Otomatik tarama için admin oturumu bulunamadı.");
        setScanningProductId(null);
        return;
      }

      const response = await fetch("/api/security/scan-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage("Otomatik tarama başarısız: " + (result.error || "Bilinmeyen hata"));
        setScanningProductId(null);
        return;
      }

      setMessage(
        `Otomatik tarama tamamlandı. Sonuç: ${result.securityStatus}. Skor: ${result.score}.`
      );

      setOpenReportProductId(productId);
      await loadProducts(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? "Otomatik tarama hatası: " + error.message
          : "Otomatik tarama sırasında bilinmeyen hata oluştu."
      );
    } finally {
      setScanningProductId(null);
    }
  }

  async function updateProductStatus(productId: string, status: string) {
    setMessage("");

    const { error } = await supabase
      .from("products")
      .update({ status })
      .eq("id", productId);

    if (error) {
      setMessage("Ürün durumu güncellenemedi: " + error.message);
      return;
    }

    await loadProducts(false);
  }

  async function updateSecurityStatus(productId: string, securityStatus: string) {
    const note = window.prompt(
      "Güvenlik notu yaz:",
      securityStatus === "Güvenli"
        ? "Manuel inceleme sonucu güvenli bulundu."
        : securityStatus === "Riskli"
        ? "Riskli içerik tespit edildi."
        : "Manuel inceleme gerekiyor."
    );

    if (note === null) {
      return;
    }

    setMessage("");

    const { error } = await supabase
      .from("products")
      .update({
        security_status: securityStatus,
        security_note: note,
        security_checked_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (error) {
      setMessage("Güvenlik durumu güncellenemedi: " + error.message);
      return;
    }

    await loadProducts(false);
  }

  function statusClass(status: string) {
    if (status === "Yayında") {
      return "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "Reddedildi") {
      return "w-fit rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    if (status === "Yayından Kaldırıldı") {
      return "w-fit rounded-full bg-gray-500/20 px-4 py-2 text-sm text-gray-300";
    }

    if (status === "İnceleniyor") {
      return "w-fit rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300";
    }

    return "w-fit rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
  }

  function securityClass(status?: string | null) {
    if (status === "Güvenli") {
      return "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "Riskli") {
      return "w-fit rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    if (status === "Manuel İnceleme") {
      return "w-fit rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300";
    }

    return "w-fit rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
  }

  function issueClass(level: string) {
    if (level === "critical") {
      return "rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white";
    }

    if (level === "high") {
      return "rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300";
    }

    if (level === "medium") {
      return "rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300";
    }

    return "rounded-full bg-gray-500/20 px-3 py-1 text-xs font-semibold text-gray-300";
  }

  function formatDate(date?: string | null) {
    if (!date) return "Tarih yok";

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const totalProducts = products.length;
  const liveProducts = products.filter((product) => product.status === "Yayında").length;
  const pendingProducts = products.filter((product) => product.status === "Onay Bekliyor").length;
  const rejectedProducts = products.filter((product) => product.status === "Reddedildi").length;
  const unpublishedProducts = products.filter(
    (product) => product.status === "Yayından Kaldırıldı"
  ).length;

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesTab = activeTab === "Tümü" || product.status === activeTab;

      const searchText = `${product.title} ${product.seller} ${product.category} ${
        product.description || ""
      } ${product.status} ${product.security_status || ""}`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [products, activeTab, search]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Admin ürünleri yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Admin Ürün Yönetimi</h1>
              <p className="mt-3 text-gray-400">
                Ürünleri yönet, güvenlik taraması yap, onayla veya yayından kaldır.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => loadProducts(false)}
                disabled={refreshing}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>

              <p className="text-xs text-gray-500">
                {lastUpdated ? `Son güncelleme: ${lastUpdated}` : "Canlı takip aktif"}
              </p>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            <p>{message}</p>

            <button
              onClick={() => loadProducts(false)}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam</p>
            <h2 className="mt-3 text-4xl font-bold">{totalProducts}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Onay Bekleyen</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">
              {pendingProducts}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yayında</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">
              {liveProducts}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Reddedildi</p>
            <h2 className="mt-3 text-4xl font-bold text-red-300">
              {rejectedProducts}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yayından Kaldırıldı</p>
            <h2 className="mt-3 text-4xl font-bold text-gray-300">
              {unpublishedProducts}
            </h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid gap-3 md:grid-cols-5">
            {tabs.map((tab) => {
              const count =
                tab.key === "Tümü"
                  ? totalProducts
                  : products.filter((product) => product.status === tab.key).length;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    activeTab === tab.key
                      ? "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                      : "rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
                  }
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {tabs.find((tab) => tab.key === activeTab)?.label}
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Gösterilen ürün sayısı: {filteredProducts.length}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ürün, satıcı, kategori, güvenlik durumu ara..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-gray-500 md:w-96"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {filteredProducts.map((product) => {
              const report = product.security_scan_report || {};
              const issues = Array.isArray(report.issues) ? report.issues : [];
              const isReportOpen = openReportProductId === product.id;

              return (
                <div
                  key={product.id}
                  className="rounded-3xl bg-black/30 p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-3">
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                          {product.category}
                        </span>

                        <span className={statusClass(product.status)}>
                          {product.status}
                        </span>

                        <span className={securityClass(product.security_status)}>
                          Güvenlik: {product.security_status || "Taranmadı"}
                        </span>
                      </div>

                      <h3 className="mt-4 text-xl font-semibold">{product.title}</h3>

                      <div className="mt-2 grid gap-1 text-sm text-gray-400">
                        <p>Ürün No: {product.id}</p>
                        <p>Satıcı: {product.seller}</p>
                        <p>Fiyat: {product.price}</p>
                        <p>Eklenme: {formatDate(product.created_at)}</p>
                        <p>Dosya: {product.file_path ? "Yüklendi" : "Dosya yok"}</p>
                        <p>Güvenlik notu: {product.security_note || "Not yok"}</p>
                        <p>Lisans: {product.license_type || "Kişisel Kullanım"}</p>
                        <p>
                          Ticari kullanım:{" "}
                          {product.license_allows_commercial ? "İzinli" : "İzinli değil"}
                        </p>
                        <p>
                          Yeniden satış:{" "}
                          {product.license_allows_resale ? "İzinli" : "Yasak"}
                        </p>
                        <p>Tarama skoru: {product.security_scan_score ?? 0}</p>
                        <p>Son tarama: {formatDate(product.security_scanned_at)}</p>
                        <p>Güçlü tarama: {product.strong_scan_status || "Yok"}</p>
                      </div>

                      {product.description && (
                        <p className="mt-4 text-sm leading-6 text-gray-400">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2 lg:min-w-60">
                      <button
                        onClick={() => {
                          if (!product.file_path) {
                            setMessage("Bu üründe ZIP dosyası yok. Güçlü tarama yapılamaz.");
                            return;
                          }

                          queueStrongScan(product.id);
                        }}
                        disabled={queuingStrongScanProductId === product.id || !product.file_path}
                        className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
                      >
                        {!product.file_path
                          ? "ZIP Yok"
                          : queuingStrongScanProductId === product.id
                          ? "Kuyruğa Alınıyor..."
                          : "Güçlü Tara"}
                      </button>

                      <button
                        onClick={() => scanProduct(product.id)}
                        disabled={scanningProductId === product.id}
                        className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500 disabled:opacity-60"
                      >
                        {scanningProductId === product.id ? "Taranıyor..." : "Otomatik Tara"}
                      </button>

                      <button
                        onClick={() => updateSecurityStatus(product.id, "Güvenli")}
                        className="rounded-2xl border border-green-500/30 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/10"
                      >
                        Güvenli İşaretle
                      </button>

                      <button
                        onClick={() => updateSecurityStatus(product.id, "Manuel İnceleme")}
                        className="rounded-2xl border border-blue-500/30 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/10"
                      >
                        İncelemeye Al
                      </button>

                      <button
                        onClick={() => updateSecurityStatus(product.id, "Riskli")}
                        className="rounded-2xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        Riskli İşaretle
                      </button>

                      <button
                        onClick={() => updateProductStatus(product.id, "Yayında")}
                        className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-500"
                      >
                        Onayla / Yayına Al
                      </button>

                      <button
                        onClick={() => updateProductStatus(product.id, "Onay Bekliyor")}
                        className="rounded-2xl border border-yellow-500/30 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/10"
                      >
                        Beklemeye Al
                      </button>

                      <button
                        onClick={() => updateProductStatus(product.id, "Reddedildi")}
                        className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
                      >
                        Reddet
                      </button>

                      <button
                        onClick={() =>
                          updateProductStatus(product.id, "Yayından Kaldırıldı")
                        }
                        className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10"
                      >
                        Yayından Kaldır
                      </button>

                      <button
                        onClick={() =>
                          setOpenReportProductId(isReportOpen ? null : product.id)
                        }
                        className="rounded-2xl border border-purple-500/30 px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/10"
                      >
                        {isReportOpen ? "Raporu Kapat" : "Tarama Raporu"}
                      </button>

                      <a
                        href={`/product/${product.id}`}
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Detay Aç
                      </a>
                    </div>
                  </div>

                  {isReportOpen && (
                    <section className="mt-6 rounded-3xl border border-purple-500/20 bg-purple-500/10 p-5">
                      <h4 className="text-xl font-bold">Otomatik Tarama Raporu</h4>

                      <div className="mt-5 grid gap-4 md:grid-cols-4">
                        <div className="rounded-2xl bg-black/30 p-4">
                          <p className="text-sm text-gray-400">Sonuç</p>
                          <p className="mt-2 font-bold">
                            {product.security_status || "Taranmadı"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-4">
                          <p className="text-sm text-gray-400">Skor</p>
                          <p className="mt-2 font-bold">
                            {product.security_scan_score ?? 0}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-4">
                          <p className="text-sm text-gray-400">Kontrol Edilen Dosya</p>
                          <p className="mt-2 font-bold">
                            {report.checkedFiles ?? 0}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-4">
                          <p className="text-sm text-gray-400">Taranan Metin Dosyası</p>
                          <p className="mt-2 font-bold">
                            {report.scannedTextFiles ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl bg-black/30 p-4">
                        <p className="text-sm text-gray-400">Özet</p>
                        <p className="mt-2 leading-7 text-gray-300">
                          {report.summary || product.security_note || "Tarama raporu yok."}
                        </p>
                      </div>

                      <div className="mt-5">
                        <h5 className="font-bold">Bulunan Riskler</h5>

                        <div className="mt-4 grid gap-3">
                          {issues.map((issue, index) => (
                            <div
                              key={`${issue.file}-${index}`}
                              className="rounded-2xl border border-white/10 bg-black/30 p-4"
                            >
                              <div className="flex flex-wrap items-center gap-3">
                                <span className={issueClass(issue.level)}>
                                  {issue.level.toUpperCase()}
                                </span>

                                <span className="break-all text-sm text-gray-400">
                                  {issue.file}
                                </span>
                              </div>

                              <p className="mt-3 text-sm leading-6 text-gray-300">
                                {issue.message}
                              </p>
                            </div>
                          ))}

                          {issues.length === 0 && (
                            <div className="rounded-2xl bg-black/30 p-4 text-sm text-green-300">
                              Otomatik taramada riskli bulgu bulunmadı.
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center">
                <h3 className="text-2xl font-bold">Ürün bulunamadı</h3>
                <p className="mt-2 text-gray-400">
                  Bu sekmede veya aramada eşleşen ürün yok.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
