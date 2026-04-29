import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Product = {
  id: string;
  title: string;
  seller: string;
  seller_id: string | null;
  category: string;
  price: string;
  status: string;
  description: string | null;
  created_at?: string;
};

export default function AdminProductsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading) return;

    const timer = setTimeout(() => {
      setMessage((current) =>
        current || "Sunucu yanıtı gecikti. Sayfayı yenileyebilir veya tekrar deneyebilirsin."
      );
      setLoading(false);
    }, 12000);

    return () => clearTimeout(timer);
  }, [loading]);


  async function loadProducts() {
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    setUser(userData.user);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Ürünler yüklenirken hata oluştu: " + error.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

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

    await loadProducts();
  }

  const totalProducts = products.length;
  const liveProducts = products.filter((product) => product.status === "Yayında").length;
  const pendingProducts = products.filter((product) => product.status === "Onay Bekliyor").length;
  const rejectedProducts = products.filter((product) => product.status === "Reddedildi").length;
  const unpublishedProducts = products.filter((product) => product.status === "Yayından Kaldırıldı").length;

  function statusClass(status: string) {
    if (status === "Yayında") {
      return "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300 md:ml-auto";
    }

    if (status === "Reddedildi") {
      return "w-fit rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300 md:ml-auto";
    }

    if (status === "Yayından Kaldırıldı") {
      return "w-fit rounded-full bg-gray-500/20 px-4 py-2 text-sm text-gray-300 md:ml-auto";
    }

    if (status === "İnceleniyor") {
      return "w-fit rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300 md:ml-auto";
    }

    return "w-fit rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300 md:ml-auto";
  }

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
        <SiteNavbar />

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ürün</p>
            <h2 className="mt-3 text-4xl font-bold">{totalProducts}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yayında</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{liveProducts}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Onay Bekliyor</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">{pendingProducts}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Reddedildi</p>
            <h2 className="mt-3 text-4xl font-bold text-red-300">{rejectedProducts}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yayından Kaldırıldı</p>
            <h2 className="mt-3 text-4xl font-bold text-gray-300">{unpublishedProducts}</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Ürün Durum Yönetimi</h2>
          <p className="mt-2 text-sm text-gray-400">
            Sadece “Yayında” durumundaki ürünler kullanıcı tarafındaki ürünler sayfasında görünür.
          </p>

          <div className="mt-6 grid gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-5 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="max-w-2xl">
                  <h3 className="text-xl font-semibold">{product.title}</h3>

                  <div className="mt-2 grid gap-1 text-sm text-gray-400">
                    <p>Ürün No: {product.id}</p>
                    <p>Satıcı: {product.seller}</p>
                    <p>Kategori: {product.category}</p>
                    <p>Fiyat: {product.price}</p>
                  </div>

                  {product.description && (
                    <p className="mt-4 text-sm leading-6 text-gray-400">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 md:min-w-60 md:text-right">
                  <span className={statusClass(product.status)}>
                    {product.status}
                  </span>

                  <div className="grid gap-2">
                    <button
                      onClick={() => updateProductStatus(product.id, "Yayında")}
                      className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-500"
                    >
                      Onayla / Yayına Al
                    </button>

                    <button
                      onClick={() => updateProductStatus(product.id, "Reddedildi")}
                      className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
                    >
                      Reddet
                    </button>

                    <button
                      onClick={() => updateProductStatus(product.id, "Onay Bekliyor")}
                      className="rounded-2xl border border-yellow-500/30 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/10"
                    >
                      Beklemeye Al
                    </button>

                    <button
                      onClick={() => updateProductStatus(product.id, "Yayından Kaldırıldı")}
                      className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10"
                    >
                      Yayından Kaldır
                    </button>
                  </div>

                  <a
                    href={`/product/${product.id}`}
                    className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                  >
                    Detay Aç
                  </a>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
              Henüz ürün yok.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
