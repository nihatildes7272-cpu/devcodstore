import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  seller_id: string | null;
  status: string;
  description: string | null;
  created_at?: string;
};

const categories = ["Web Site", "Dashboard", "Frontend", "Mobile UI"];

export default function SellerPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadMyProducts(currentUser: User) {
    const sellerName =
      currentUser.user_metadata?.full_name ||
      currentUser.email ||
      "Bilinmeyen Satıcı";

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Ürünlerin yüklenirken hata oluştu: " + error.message);
      setMyProducts([]);
      return;
    }

    const filteredProducts = (data || []).filter((product) => {
      return product.seller_id === currentUser.id || product.seller === sellerName;
    });

    setMyProducts(filteredProducts);
  }

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);
      await loadMyProducts(data.user);
      setLoadingUser(false);
    }

    checkUser();
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (!user) {
      setMessage("Ürün eklemek için giriş yapmalısın.");
      setSaving(false);
      return;
    }

    const sellerName =
      user.user_metadata?.full_name ||
      user.email ||
      "Bilinmeyen Satıcı";

    const newProduct = {
      id: String(Date.now()),
      title,
      category,
      price,
      seller: sellerName,
      seller_id: user.id,
      status: "Onay Bekliyor",
      description,
    };

    const { error } = await supabase.from("products").insert(newProduct);

    setSaving(false);

    if (error) {
      setMessage("Ürün eklenirken hata oluştu: " + error.message);
      return;
    }

    setTitle("");
    setCategory("Web Site");
    setPrice("");
    setDescription("");

    await loadMyProducts(user);
    setMessage("Ürün başarıyla gönderildi. Admin onayı bekliyor.");
  }

  function statusClass(status: string) {
    if (status === "Yayında") {
      return "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "Reddedildi") {
      return "w-fit rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    return "w-fit rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
  }

  if (loadingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Satıcı paneli yükleniyor...
      </main>
    );
  }

  const pendingCount = myProducts.filter((item) => item.status === "Onay Bekliyor").length;
  const liveCount = myProducts.filter((item) => item.status === "Yayında").length;
  const rejectedCount = myProducts.filter((item) => item.status === "Reddedildi").length;

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore Satıcı Paneli</h1>
            <p className="text-sm text-gray-400">
              Projelerini yükle, durumlarını takip et
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/account"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Hesabım
            </a>

            <a
              href="/products"
              className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Ürünler
            </a>
          </div>
        </nav>

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Satıcı</p>
            <h2 className="mt-3 break-all text-xl font-bold">
              {user?.user_metadata?.full_name || user?.email}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Onay Bekleyen</p>
            <h2 className="mt-3 text-4xl font-bold text-yellow-300">{pendingCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yayında</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{liveCount}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Reddedildi</p>
            <h2 className="mt-3 text-4xl font-bold text-red-300">{rejectedCount}</h2>
          </div>
        </section>

        {message && (
          <div className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            {message}
          </div>
        )}

        <section className="mt-10 grid gap-8 md:grid-cols-[1fr_520px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Yeni Proje Yükle</h2>
            <p className="mt-2 text-sm text-gray-400">
              Gönderilen ürün admin onayına düşer.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Proje adı"
                required
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Fiyat örnek: ₺499"
                required
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Proje açıklaması"
                required
                className="min-h-36 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? "Gönderiliyor..." : "Projeyi Gönder"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Eklediğim Ürünler</h2>
            <p className="mt-2 text-sm text-gray-400">
              Ürünlerinin admin onay durumunu buradan takip edebilirsin.
            </p>

            <div className="mt-6 grid gap-4">
              {myProducts.map((product) => (
                <div key={product.id} className="rounded-2xl bg-black/30 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{product.title}</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        {product.category} • {product.price}
                      </p>
                    </div>

                    <span className={statusClass(product.status)}>
                      {product.status}
                    </span>
                  </div>

                  {product.description && (
                    <p className="mt-4 text-sm leading-6 text-gray-400">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-5 flex gap-3">
                    <a
                      href={`/product/${product.id}`}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
                    >
                      Detay Aç
                    </a>

                    <a
                      href="/admin/products"
                      className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold"
                    >
                      Admin Onayına Bak
                    </a>
                  </div>
                </div>
              ))}

              {myProducts.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-gray-400">
                  Henüz ürün eklemedin.
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
