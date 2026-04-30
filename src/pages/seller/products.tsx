import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import SellerPanelNav from "@/components/SellerPanelNav";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  status: string;
  security_status?: string | null;
  image_url?: string | null;
  file_type?: string | null;
  license_type?: string | null;
  created_at?: string;
};

export default function SellerProductsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
      .select("id,title,category,price,status,security_status,image_url,file_type,license_type,created_at")
      .eq("seller_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Ürünler yüklenemedi: " + error.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function unpublishProduct(productId: string) {
    const confirmed = window.confirm("Bu ürünü yayından kaldırmak istiyor musun?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .update({ status: "Yayından Kaldırıldı" })
      .eq("id", productId);

    if (error) {
      setMessage("Ürün yayından kaldırılamadı: " + error.message);
      return;
    }

    await loadProducts();
  }

  function statusClass(status: string) {
    if (status === "Yayında") return "rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-300";
    if (status === "Reddedildi") return "rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300";
    if (status === "Yayından Kaldırıldı") return "rounded-full bg-gray-500/20 px-3 py-1 text-xs text-gray-300";
    return "rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-300";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Ürünlerim yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Ürünlerim</h1>
              <p className="mt-3 text-gray-400">
                Eklediğin ürünleri, durumlarını ve düzenleme işlemlerini buradan yönet.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={loadProducts}
                className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10"
              >
                Yenile
              </button>

              <a
                href="/seller/new"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
              >
                Yeni Ürün
              </a>
            </div>
          </div>
        </section>

        <SellerPanelNav />

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-5">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-5">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-28 w-36 rounded-2xl object-cover"
                    />
                  )}

                  <div>
                    <div className="flex flex-wrap gap-3">
                      <span className={statusClass(product.status)}>{product.status}</span>
                      <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
                        {product.category}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-bold">{product.title}</h2>
                    <p className="mt-2 text-sm text-gray-400">
                      {product.price} • {product.file_type || "Dijital Dosya"} • {product.license_type || "Lisans"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Güvenlik: {product.security_status || "Taranmadı"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:min-w-44">
                  <a
                    href={`/seller/edit/${product.id}`}
                    className="rounded-2xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold hover:bg-blue-500"
                  >
                    Düzenle
                  </a>

                  <a
                    href={`/product/${product.id}`}
                    className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                  >
                    Detay Aç
                  </a>

                  <button
                    onClick={() => unpublishProduct(product.id)}
                    className="rounded-2xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10"
                  >
                    Yayından Kaldır
                  </button>
                </div>
              </div>
            </div>
          ))}

          {products.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
              Henüz ürün eklemedin.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
