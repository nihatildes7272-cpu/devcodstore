import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Product = {
  id: string;
  title: string;
  price: string;
  seller: string;
  category: string;
  file_path: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  license_type?: string | null;
  license_summary?: string | null;
  license_allows_commercial?: boolean | null;
  license_allows_resale?: boolean | null;
};

type Order = {
  id: string;
  user_id: string | null;
  product_id: string | null;
  product_title: string;
  price: string;
  seller: string;
  status: string;
  created_at: string;
};

const DOWNLOAD_LIMIT = 5;

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 12000,
  message = "Sunucu yanıtı gecikti. Lütfen tekrar dene."
): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export default function DownloadPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState<Product | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");
  const [remainingDownloads, setRemainingDownloads] = useState<number | null>(null);

  async function loadDownloadAccess(showLoading = true) {
    if (!router.isReady || !id) return;

    if (showLoading) {
      setLoading(true);
    } else {
      setChecking(true);
    }

    setMessage("");

    try {
      const sessionResult = await withTimeout(
        supabase.auth.getSession(),
        8000,
        "Oturum bilgisi alınırken gecikme oldu."
      );

      const currentUser = sessionResult.data.session?.user;

      if (!currentUser) {
        setLoading(false);
        setChecking(false);
        router.replace("/login");
        return;
      }

      const orderResult = await withTimeout(
        supabase
          .from("orders")
          .select("id,user_id,product_id,product_title,price,seller,status,created_at")
          .eq("user_id", currentUser.id)
          .eq("product_id", String(id))
          .neq("status", "İade Edildi")
          .limit(1)
          .maybeSingle(),
        12000,
        "Sipariş kontrolü yapılırken sunucu geç cevap verdi."
      );

      if (orderResult.error) {
        setMessage("Sipariş kontrolü yapılırken hata oluştu: " + orderResult.error.message);
        setOrder(null);
        setProduct(null);
        return;
      }

      if (!orderResult.data) {
        setMessage("Bu ürüne erişimin yok. Önce ürünü satın almalısın.");
        setOrder(null);
        setProduct(null);
        return;
      }

      setOrder(orderResult.data);

      const productResult = await withTimeout(
        supabase
          .from("products")
          .select("id,title,price,seller,category,file_path,file_name,file_type,file_size,license_type,license_summary,license_allows_commercial,license_allows_resale")
          .eq("id", String(id))
          .maybeSingle(),
        12000,
        "Ürün bilgisi yüklenirken sunucu geç cevap verdi."
      );

      if (productResult.error) {
        setMessage("Ürün bilgisi yüklenirken hata oluştu: " + productResult.error.message);
        setProduct(null);
        return;
      }

      if (!productResult.data) {
        setMessage("Ürün bilgisi bulunamadı.");
        setProduct(null);
        return;
      }

      setProduct(productResult.data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Dosya erişimi kontrol edilirken bilinmeyen bir hata oluştu."
      );
      setOrder(null);
      setProduct(null);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  useEffect(() => {
    loadDownloadAccess(true);
  }, [router.isReady, id]);

  async function downloadZip() {
    if (!product?.file_path) {
      setMessage("Bu ürün için henüz ürün dosyası yüklenmemiş.");
      return;
    }

    setDownloading(true);
    setMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setMessage("İndirme için oturum bulunamadı. Lütfen tekrar giriş yap.");
        return;
      }

      const response = await fetch("/api/download/create-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          productId: product.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "İndirme bağlantısı oluşturulamadı.");
        return;
      }

      if (typeof result.remainingDownloads === "number") {
        setRemainingDownloads(result.remainingDownloads);
      }

      window.location.href = result.signedUrl;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "İndirme bağlantısı oluşturulurken bilinmeyen bir hata oluştu."
      );
    } finally {
      setDownloading(false);
    }
  }

  function formatFileSize(size?: number | null) {
    if (!size) return "Bilinmiyor";

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;

    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function shownFileName(path: string | null) {
    if (!path) return "Dosya yok";
    return path.split("/").pop() || "proje-dosyasi.zip";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070A12] text-white">
        <section className="mx-auto max-w-6xl px-6 py-10">
          <SiteNavbar />

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            Dosya erişimi kontrol ediliyor...
          </section>
        </section>
      </main>
    );
  }

  if (!product || !order) {
    return (
      <main className="min-h-screen bg-[#070A12] text-white">
        <section className="mx-auto max-w-6xl px-6 py-10">
          <SiteNavbar />

          <section className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <h1 className="text-3xl font-bold">Erişim Engellendi</h1>

            <p className="mt-4 text-red-200">
              {message || "Bu dosyaya erişim iznin yok."}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => loadDownloadAccess(true)}
                disabled={checking}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {checking ? "Kontrol ediliyor..." : "Tekrar Dene"}
              </button>

              <a
                href="/library"
                className="rounded-2xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/10"
              >
                Dosyalarım
              </a>

              <a
                href="/products"
                className="rounded-2xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/10 sm:col-span-2"
              >
                Ürünlere Git
              </a>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <SiteNavbar />

        <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold">Dosya İndirme</h1>
            <p className="mt-3 text-gray-400">
              Satın aldığın proje dosyasına erişimin var.
            </p>
          </div>

          {message && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {message}
            </div>
          )}

          <div className="mt-8 rounded-3xl bg-black/30 p-6">
            <p className="text-sm text-gray-400">Ürün</p>
            <h2 className="mt-2 text-2xl font-bold">{product.title}</h2>

            <p className="mt-2 text-sm text-gray-400">Satıcı: {product.seller}</p>
            <p className="mt-1 text-sm text-gray-400">Kategori: {product.category}</p>

            <div className="mt-6 grid gap-4">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 p-4">
                <span className="text-gray-400">Dosya adı</span>
                <span className="break-all text-right font-semibold">
                  {product.file_name || shownFileName(product.file_path)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 p-4">
                <span className="text-gray-400">Dosya türü</span>
                <span className="text-right font-semibold">
                  {product.file_type || "Dijital Dosya"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 p-4">
                <span className="text-gray-400">Dosya boyutu</span>
                <span className="text-right font-semibold">
                  {formatFileSize(product.file_size)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
                <span className="text-gray-400">Sipariş durumu</span>
                <span className="font-semibold text-green-300">{order.status}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
                <span className="text-gray-400">Erişim</span>
                <span className="font-semibold text-green-300">Onaylandı</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
                <span className="text-gray-400">İndirme hakkı</span>
                <span className="text-right font-semibold text-blue-300">
                  {remainingDownloads === null
                    ? `${DOWNLOAD_LIMIT} toplam hak`
                    : `${remainingDownloads} hak kaldı`}
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 p-4">
                <p className="text-sm text-gray-400">Lisans</p>
                <p className="mt-2 font-semibold text-blue-300">
                  {product.license_type || "Kişisel Kullanım"}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {product.license_summary ||
                    "Bu ürün satın alan kullanıcı tarafından kullanılabilir. Yeniden satış hakkı vermez."}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={downloadZip}
            disabled={downloading || !product.file_path}
            className="mt-8 w-full rounded-2xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {downloading ? "İndirme hazırlanıyor..." : "Dosyayı İndir"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            İndirme bağlantısı kısa süreli oluşturulur. Her satın alma en fazla {DOWNLOAD_LIMIT} indirme hakkı verir.
          </p>

          <div className="mt-6 flex justify-center gap-4">
            <a href="/library" className="text-sm text-gray-400 hover:text-white">
              Dosyalarıma dön
            </a>

            <a href={`/product/${product.id}`} className="text-sm text-gray-400 hover:text-white">
              Ürüne git
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
