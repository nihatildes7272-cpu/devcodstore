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
  created_at?: string;
};

type Order = {
  id: string;
  user_id: string | null;
  product_id: string | null;
  product_title: string;
  price: string;
  seller: string;
  seller_id: string | null;
  status: string;
  created_at: string;
};

const categories = ["Web Site", "Dashboard", "Frontend", "Mobile UI"];

function safeFileName(fileName: string) {
  const cleaned = fileName
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned.endsWith(".zip") ? cleaned : `${cleaned}.zip`;
}

export default function SellerPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loadingUser) return;

    const timer = setTimeout(() => {
      setMessage((current) =>
        current || "Sunucu yanıtı gecikti. Sayfayı yenileyebilir veya tekrar deneyebilirsin."
      );
      setLoadingUser(false);
    }, 12000);

    return () => clearTimeout(timer);
  }, [loadingUser]);


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

  async function loadMyOrders(currentUser: User) {
    const sellerName =
      currentUser.user_metadata?.full_name ||
      currentUser.email ||
      "Bilinmeyen Satıcı";

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Satışların yüklenirken hata oluştu: " + error.message);
      setMyOrders([]);
      return;
    }

    const filteredOrders = (data || []).filter((order) => {
      return order.seller_id === currentUser.id || order.seller === sellerName;
    });

    setMyOrders(filteredOrders);
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
      await loadMyOrders(data.user);
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

    if (!zipFile) {
      setMessage("Lütfen ürün ZIP dosyasını seç.");
      setSaving(false);
      return;
    }

    const productId = String(Date.now());

    const sellerName =
      user.user_metadata?.full_name ||
      user.email ||
      "Bilinmeyen Satıcı";

    const filePath = `${user.id}/${productId}/${safeFileName(zipFile.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("product-files")
      .upload(filePath, zipFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setMessage("ZIP dosyası yüklenirken hata oluştu: " + uploadError.message);
      setSaving(false);
      return;
    }

    const newProduct = {
      id: productId,
      title,
      category,
      price,
      seller: sellerName,
      seller_id: user.id,
      status: "Onay Bekliyor",
      description,
      file_path: filePath,
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
    setZipFile(null);

    await loadMyProducts(user);
    setMessage("Ürün ve ZIP dosyası başarıyla gönderildi. Admin onayı bekliyor.");
  }

  async function unpublishProduct(productId: string) {
    const confirmed = window.confirm("Bu ürünü yayından kaldırmak istiyor musun?");

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({ status: "Yayından Kaldırıldı" })
      .eq("id", productId);

    if (error) {
      setMessage("Ürün yayından kaldırılamadı: " + error.message);
      return;
    }

    if (user) {
      await loadMyProducts(user);
    }

    setMessage("Ürün yayından kaldırıldı.");
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

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const completedOrders = myOrders.filter((order) => order.status === "Tamamlandı");
  const totalSales = completedOrders.length;
  const totalRevenue = completedOrders.reduce((total, order) => {
    return total + parsePrice(order.price);
  }, 0);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="grid gap-6 md:grid-cols-6">
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

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Satış</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{totalSales}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kazanç</p>
            <h2 className="mt-3 text-3xl font-bold">{formatMoney(totalRevenue)}</h2>
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
              Ürün ve ZIP dosyası admin onayına gönderilir.
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

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">ZIP dosyası</p>
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(event) => setZipFile(event.target.files?.[0] || null)}
                  required
                  className="w-full text-sm text-gray-300"
                />
              </label>

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

                  <p className="mt-3 text-xs text-gray-500">
                    Dosya: {product.file_path ? "Yüklendi" : "Henüz dosya yok"}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={`/seller/edit/${product.id}`}
                      className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Düzenle
                    </a>

                    <a
                      href={`/product/${product.id}`}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
                    >
                      Detay Aç
                    </a>

                    <button
                      onClick={() => unpublishProduct(product.id)}
                      className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Yayından Kaldır
                    </button>

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

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Satışlarım</h2>
          <p className="mt-2 text-sm text-gray-400">
            Ürünlerinden oluşan gerçek sipariş kayıtları burada görünür.
          </p>

          <div className="mt-6 grid gap-4">
            {myOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-4 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="text-xl font-semibold">{order.product_title}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Sipariş No: {order.id}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Tarih: {formatDate(order.created_at)}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Durum: {order.status}
                  </p>
                </div>

                <div className="grid gap-3 md:text-right">
                  <p className="text-2xl font-bold">{order.price}</p>

                  {order.product_id && (
                    <a
                      href={`/product/${order.product_id}`}
                      className="rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-black"
                    >
                      Ürünü Aç
                    </a>
                  )}
                </div>
              </div>
            ))}

            {myOrders.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-gray-400">
                Henüz satış kaydı yok.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
