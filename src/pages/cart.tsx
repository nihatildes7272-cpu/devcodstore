import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import type { User } from "@supabase/supabase-js";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  status: string;
  description: string | null;
  file_path: string | null;
};

function withTimeout<T>(promise: PromiseLike<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Sepet yüklenirken sunucu yanıtı gecikti.")), ms);
    }),
  ]);
}

export default function CartPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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

  async function loadCartProducts() {
    setLoading(true);
    setMessage("");

    try {
      const userResult = await withTimeout(supabase.auth.getUser(), 10000);
      const currentUser = userResult.data.user;
      setUser(currentUser);

      let ids: string[] = [];

      if (currentUser) {
        const cartResult = await withTimeout(
          supabase
            .from("cart_items")
            .select("product_id,created_at")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: true }),
          15000
        );

        if (cartResult.error) {
          setMessage("Sepet yüklenirken hata oluştu: " + cartResult.error.message);
          setProducts([]);
          setLoading(false);
          return;
        }

        ids = (cartResult.data || []).map((item) => item.product_id);
      } else {
        ids = readLocalCart();
      }

      setCartIds(ids);

      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const productResult = await withTimeout(
        supabase
          .from("products")
          .select("id,title,category,price,seller,status,description,file_path")
          .in("id", ids),
        15000
      );

      if (productResult.error) {
        setMessage("Sepet ürünleri yüklenirken hata oluştu: " + productResult.error.message);
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
          : "Sepet yüklenirken bilinmeyen bir hata oluştu."
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCartProducts();
  }, []);

  async function removeFromCart(productId: string) {
    try {
      if (user) {
        await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
      } else {
        const updatedIds = cartIds.filter((id) => id !== productId);
        localStorage.setItem("devcodstore_cart", JSON.stringify(updatedIds));
        setCartIds(updatedIds);
      }

      window.dispatchEvent(new Event("devcodstore-cart-updated"));
      setProducts((current) => current.filter((product) => product.id !== productId));
    } catch {
      setMessage("Ürün sepetten kaldırılamadı.");
    }
  }

  async function clearCart() {
    try {
      if (user) {
        await supabase.from("cart_items").delete().eq("user_id", user.id);
      } else {
        localStorage.removeItem("devcodstore_cart");
        setCartIds([]);
      }

      window.dispatchEvent(new Event("devcodstore-cart-updated"));
      setProducts([]);
    } catch {
      setMessage("Sepet temizlenirken hata oluştu.");
    }
  }

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

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Sepetim</h1>
              <p className="mt-2 text-gray-400">
                {user
                  ? "Bu sepet hesabına bağlıdır."
                  : "Giriş yapmadığın için bu sepet sadece bu cihazda tutulur."}
              </p>
            </div>

            <div className="rounded-2xl bg-black/30 px-5 py-3 text-sm text-gray-300">
              Sepetteki ürün:{" "}
              <span className="font-bold text-white">{products.length}</span>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{message}</p>

            <button
              onClick={loadCartProducts}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            Sepet yükleniyor...
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="text-6xl">🛒</div>
              <h2 className="mt-5 text-3xl font-bold">Sepetin Boş</h2>
              <p className="mt-3 text-gray-400">
                Ürün eklemek için ürünler sayfasına gidebilirsin.
              </p>

              <a
                href="/products"
                className="mt-8 inline-block rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
              >
                Ürünleri Keşfet
              </a>
            </section>
          </div>
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

                    <div className="grid gap-3 md:min-w-44 md:text-right">
                      <p className="text-3xl font-bold">{product.price}</p>

                      <a
                        href={`/product/${product.id}`}
                        className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                      >
                        Ürünü Aç
                      </a>

                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="rounded-2xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10"
                      >
                        Sepetten Kaldır
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold">Sipariş Özeti</h2>

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

              <div className="mt-8 grid gap-3">
                <a
                  href="/checkout/cart"
                  className="rounded-2xl bg-blue-600 px-5 py-4 text-center font-semibold hover:bg-blue-500"
                >
                  Sepeti Satın Al
                </a>

                <button
                  onClick={clearCart}
                  className="rounded-2xl border border-red-500/30 px-5 py-4 font-semibold text-red-200 hover:bg-red-500/10"
                >
                  Sepeti Temizle
                </button>

                <a
                  href="/products"
                  className="rounded-2xl border border-white/15 px-5 py-4 text-center font-semibold hover:bg-white/10"
                >
                  Alışverişe Devam Et
                </a>
              </div>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}
