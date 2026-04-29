import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  seller_id: string | null;
  status: string;
  description: string | null;
  file_path: string | null;
};

function withTimeout<T>(promise: PromiseLike<T>, ms = 15000, message = "Sunucu yanıtı gecikti.") {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export default function CartCheckoutPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function readLocalCart() {
    try {
      const rawCart = localStorage.getItem("devcodstore_cart");
      const ids = rawCart ? JSON.parse(rawCart) : [];
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  }

  async function loadCheckout() {
    setLoading(true);
    setMessage("");

    try {
      const userResult = await withTimeout(
        supabase.auth.getUser(),
        10000,
        "Kullanıcı bilgisi alınırken sunucu geç cevap verdi."
      );

      const currentUser = userResult.data.user;

      if (!currentUser) {
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(currentUser);

      let ids: string[] = [];

      const cartResult = await withTimeout(
        supabase
          .from("cart_items")
          .select("product_id,created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: true }),
        15000,
        "Hesap sepeti yüklenirken sunucu geç cevap verdi."
      );

      if (cartResult.error) {
        setMessage("Hesap sepeti yüklenemedi: " + cartResult.error.message);
        setProducts([]);
        setLoading(false);
        return;
      }

      ids = (cartResult.data || []).map((item) => item.product_id);

      if (ids.length === 0) {
        const localIds = readLocalCart();

        if (localIds.length > 0) {
          ids = localIds;
        }
      }

      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const productResult = await withTimeout(
        supabase
          .from("products")
          .select("id,title,category,price,seller,seller_id,status,description,file_path")
          .in("id", ids),
        15000,
        "Sepet ürünleri yüklenirken sunucu geç cevap verdi."
      );

      if (productResult.error) {
        setMessage("Sepet ürünleri yüklenemedi: " + productResult.error.message);
        setProducts([]);
      } else {
        const sortedProducts = ids
          .map((id) => (productResult.data || []).find((product) => product.id === id))
          .filter(Boolean) as Product[];

        setProducts(sortedProducts);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Sepet ödeme ekranı yüklenirken bilinmeyen bir hata oluştu."
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCheckout();
  }, []);

  function parsePrice(price: string) {
    const numberText = price.replace(/[^\d]/g, "");
    return Number(numberText || 0);
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(value);
  }

  const totalPrice = products.reduce((total, product) => {
    return total + parsePrice(product.price);
  }, 0);

  async function completeCartOrder() {
    if (!user) {
      setMessage("Sipariş oluşturmak için giriş yapmalısın.");
      return;
    }

    if (products.length === 0) {
      setMessage("Sepetinde ürün yok.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const orders = products.map((product) => ({
        user_id: user.id,
        product_id: product.id,
        product_title: product.title,
        price: product.price,
        seller: product.seller,
        seller_id: product.seller_id,
        status: "Tamamlandı",
      }));

      const orderResult = await withTimeout(
        supabase.from("orders").insert(orders),
        20000,
        "Sipariş oluşturulurken sunucu geç cevap verdi."
      );

      if (orderResult.error) {
        setMessage("Sipariş oluşturulamadı: " + orderResult.error.message);
        setSaving(false);
        return;
      }

      await supabase.from("cart_items").delete().eq("user_id", user.id);
      localStorage.removeItem("devcodstore_cart");

      window.dispatchEvent(new Event("devcodstore-cart-updated"));

      setSaving(false);
      router.push("/success/cart");
    } catch (error) {
      setSaving(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Sipariş oluşturulurken bilinmeyen bir hata oluştu."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Sepet Ödemesi</h1>
          <p className="mt-3 text-gray-400">
            Sepetindeki ürünleri tek işlemde siparişe dönüştür.
          </p>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{message}</p>

            <button
              onClick={loadCheckout}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {loading ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            Sepet ödeme ekranı yükleniyor...
          </section>
        ) : products.length === 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-6xl">🛒</div>
            <h2 className="mt-5 text-3xl font-bold">Sepetin Boş</h2>
            <p className="mt-3 text-gray-400">
              Ödeme yapmak için önce sepete ürün eklemelisin.
            </p>

            <a
              href="/products"
              className="mt-8 inline-block rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
            >
              Ürünleri Keşfet
            </a>
          </section>
        ) : (
          <section className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-5">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                        {product.category}
                      </span>

                      <h2 className="mt-4 text-2xl font-bold">{product.title}</h2>

                      <p className="mt-2 text-sm text-gray-400">
                        Satıcı: {product.seller}
                      </p>

                      {product.description && (
                        <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-400">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <p className="text-3xl font-bold">{product.price}</p>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold">Ödeme Özeti</h2>

              <div className="mt-6 grid gap-4">
                <div className="flex items-center justify-between rounded-2xl bg-black/30 p-4">
                  <span className="text-gray-400">Ürün Sayısı</span>
                  <span className="font-bold">{products.length}</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-black/30 p-4">
                  <span className="text-gray-400">Toplam</span>
                  <span className="text-3xl font-bold">{formatMoney(totalPrice)}</span>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                Şimdilik demo ödeme sistemi. PayTR onayından sonra gerçek ödeme buraya bağlanacak.
              </div>

              <button
                onClick={completeCartOrder}
                disabled={saving}
                className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-4 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? "Sipariş oluşturuluyor..." : "Ödemeyi Tamamla"}
              </button>

              <a
                href="/cart"
                className="mt-3 block rounded-2xl border border-white/15 px-5 py-4 text-center font-semibold hover:bg-white/10"
              >
                Sepete Dön
              </a>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}
