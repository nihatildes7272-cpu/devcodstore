import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  price: string;
  seller: string;
  category: string;
  file_path: string | null;
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

export default function DownloadPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDownloadAccess() {
      if (!router.isReady || !id) return;

      setLoading(true);
      setMessage("");

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      setUser(userData.user);

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id,title,price,seller,category,file_path")
        .eq("id", String(id))
        .single();

      if (productError || !productData) {
        setMessage("Ürün bulunamadı.");
        setLoading(false);
        return;
      }

      setProduct(productData);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("product_id", String(id))
        .limit(1)
        .maybeSingle();

      if (orderError) {
        setMessage("Sipariş kontrolü yapılırken hata oluştu: " + orderError.message);
        setLoading(false);
        return;
      }

      if (!orderData) {
        setMessage("Bu ürüne erişimin yok. Önce ürünü satın almalısın.");
        setLoading(false);
        return;
      }

      setOrder(orderData);
      setLoading(false);
    }

    loadDownloadAccess();
  }, [router.isReady, id, router]);

  async function downloadZip() {
    if (!product?.file_path) {
      setMessage("Bu ürün için henüz ZIP dosyası yüklenmemiş.");
      return;
    }

    setDownloading(true);
    setMessage("");

    const { data, error } = await supabase.storage
      .from("product-files")
      .createSignedUrl(product.file_path, 60);

    setDownloading(false);

    if (error || !data?.signedUrl) {
      setMessage("İndirme bağlantısı oluşturulamadı: " + (error?.message || "Bilinmeyen hata"));
      return;
    }

    window.location.href = data.signedUrl;
  }

  function shownFileName(path: string | null) {
    if (!path) return "Dosya yok";
    return path.split("/").pop() || "proje-dosyasi.zip";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Dosya erişimi kontrol ediliyor...
      </main>
    );
  }

  if ((message && !order) || !product || !order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-3xl font-bold">Erişim Engellendi</h1>

          <p className="mt-4 text-red-200">
            {message || "Bu dosyaya erişim iznin yok."}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href="/library"
              className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
            >
              Dosyalarım
            </a>

            <a
              href="/products"
              className="rounded-2xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/10"
            >
              Ürünlere Git
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
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
            <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
              <span className="text-gray-400">Dosya adı</span>
              <span className="font-semibold">{shownFileName(product.file_path)}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
              <span className="text-gray-400">Sipariş durumu</span>
              <span className="font-semibold text-green-300">{order.status}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
              <span className="text-gray-400">Erişim</span>
              <span className="font-semibold text-green-300">Onaylandı</span>
            </div>
          </div>
        </div>

        <button
          onClick={downloadZip}
          disabled={downloading || !product.file_path}
          className="mt-8 w-full rounded-2xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500 disabled:opacity-60"
        >
          {downloading ? "İndirme hazırlanıyor..." : "ZIP Dosyasını İndir"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          İndirme bağlantısı güvenlik için kısa süreli oluşturulur.
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
    </main>
  );
}
