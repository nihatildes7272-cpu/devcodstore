import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import { productCategories } from "@/lib/productCategories";
import { productLicenses, getLicenseInfo } from "@/lib/productLicenses";
import { productPreviewTypes, getPreviewInfo } from "@/lib/productPreviewTypes";

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
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  image_url: string | null;
  license_type?: string | null;
  license_summary?: string | null;
  license_allows_commercial?: boolean | null;
  license_allows_resale?: boolean | null;
  security_status?: string | null;
  security_note?: string | null;
  created_at?: string;
  demo_url?: string | null;
  tech_stack?: string | null;
  setup_notes?: string | null;
  requirements?: string | null;
  preview_type?: string | null;
  preview_note?: string | null;
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

const categories = productCategories;

function safeImageName(fileName: string) {
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

  return cleaned;
}

function detectFileType(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".zip")) return "ZIP Proje Dosyası";
  if (lower.endsWith(".pdf")) return "PDF Doküman";
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "Ders Slaytı / Sunum";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "Word Dokümanı";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "Excel Dosyası";
  if (lower.endsWith(".txt")) return "Metin Dosyası";
  if (lower.endsWith(".csv")) return "CSV Dosyası";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) return "Görsel Dosyası";
  if (lower.endsWith(".json")) return "JSON Dosyası";

  return "Dijital Dosya";
}

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

  return cleaned;
}

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

export default function SellerPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"upload" | "products" | "sales">(
    "upload"
  );
  const [sellerMenuOpen, setSellerMenuOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [licenseType, setLicenseType] = useState("Kişisel Kullanım");
  const [demoUrl, setDemoUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [setupNotes, setSetupNotes] = useState("");
  const [requirements, setRequirements] = useState("");
  const [previewType, setPreviewType] = useState("Kapak + Galeri");
  const [previewNote, setPreviewNote] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function sellerNameFor(currentUser: User) {
    return (
      currentUser.user_metadata?.full_name ||
      currentUser.email ||
      "Bilinmeyen Satıcı"
    );
  }

  async function loadSellerDashboard(currentUser: User, showLoading = false) {
    if (showLoading) {
      setLoadingUser(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const sellerName = sellerNameFor(currentUser);

      const productsResult = await withTimeout(
        supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false }),
        15000,
        "Satıcı ürünleri yüklenirken sunucu geç cevap verdi."
      );

      if (productsResult.error) {
        setMessage("Ürünlerin yüklenirken hata oluştu: " + productsResult.error.message);
        setMyProducts([]);
      } else {
        const filteredProducts = (productsResult.data || []).filter((product) => {
          return product.seller_id === currentUser.id || product.seller === sellerName;
        });

        setMyProducts(filteredProducts);
      }

      const ordersResult = await withTimeout(
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false }),
        15000,
        "Satışların yüklenirken sunucu geç cevap verdi."
      );

      if (ordersResult.error) {
        setMessage("Satışların yüklenirken hata oluştu: " + ordersResult.error.message);
        setMyOrders([]);
      } else {
        const filteredOrders = (ordersResult.data || []).filter((order) => {
          return order.seller_id === currentUser.id || order.seller === sellerName;
        });

        setMyOrders(filteredOrders);
      }

      setLastUpdated(
        new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Satıcı paneli yüklenirken bilinmeyen bir hata oluştu."
      );
    } finally {
      setLoadingUser(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let productChannel: ReturnType<typeof supabase.channel> | null = null;
    let orderChannel: ReturnType<typeof supabase.channel> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function setupSellerPanel() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      if (cancelled) return;

      setUser(data.user);
      await loadSellerDashboard(data.user, true);

      productChannel = supabase
        .channel(`seller-products-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "products",
          },
          () => {
            loadSellerDashboard(data.user!, false);
          }
        )
        .subscribe();

      orderChannel = supabase
        .channel(`seller-orders-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          () => {
            loadSellerDashboard(data.user!, false);
          }
        )
        .subscribe();

      interval = setInterval(() => {
        loadSellerDashboard(data.user!, false);
      }, 15000);
    }

    setupSellerPanel();

    return () => {
      cancelled = true;

      if (productChannel) {
        supabase.removeChannel(productChannel);
      }

      if (orderChannel) {
        supabase.removeChannel(orderChannel);
      }

      if (interval) {
        clearInterval(interval);
      }
    };
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
      setMessage("Lütfen ürün dosyasını seç.");
      setSaving(false);
      return;
    }

    if (!coverImage) {
      setMessage("Lütfen ürün kapak görselini seç.");
      setSaving(false);
      return;
    }

    const productId = String(Date.now());
    const sellerName = sellerNameFor(user);
    const filePath = `${user.id}/${productId}/${safeFileName(zipFile.name)}`;
    const imagePath = `${user.id}/${productId}/${safeImageName(coverImage.name)}`;
    const detectedFileType = detectFileType(zipFile.name);
    const selectedLicense = getLicenseInfo(licenseType);

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

    const { error: imageUploadError } = await supabase.storage
      .from("product-images")
      .upload(imagePath, coverImage, {
        cacheControl: "3600",
        upsert: false,
      });

    if (imageUploadError) {
      setMessage("Kapak görseli yüklenirken hata oluştu: " + imageUploadError.message);
      setSaving(false);
      return;
    }

    const { data: publicImage } = supabase.storage
      .from("product-images")
      .getPublicUrl(imagePath);

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
      file_name: zipFile.name,
      file_type: detectedFileType,
      file_size: zipFile.size,
      image_url: publicImage.publicUrl,
      security_status: "Taranmadı",
      security_note: "Satıcı tarafından gönderildi. Admin güvenlik incelemesi bekleniyor.",
      license_type: selectedLicense.type,
      license_summary: selectedLicense.summary,
      license_allows_commercial: selectedLicense.allowsCommercial,
      license_allows_resale: selectedLicense.allowsResale,
      demo_url: demoUrl.trim() || null,
      tech_stack: techStack.trim() || null,
      setup_notes: setupNotes.trim() || null,
      requirements: requirements.trim() || null,
      preview_type: previewType,
      preview_note: previewNote.trim() || getPreviewInfo(previewType).description,
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
    setLicenseType("Kişisel Kullanım");
    setDemoUrl("");
    setTechStack("");
    setSetupNotes("");
    setRequirements("");
    setPreviewType("Kapak + Galeri");
    setPreviewNote("");
    setZipFile(null);
    setCoverImage(null);

    await loadSellerDashboard(user, false);
    setActiveTab("products");
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
      await loadSellerDashboard(user, false);
    }

    setMessage("Ürün yayından kaldırıldı.");
  }

  function parsePrice(value: string) {
    const numberText = value.replace(/[^\d]/g, "");
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

  const tabs = [
    { key: "upload", label: "Yeni Ürün Yükle" },
    { key: "products", label: `Ürünlerim (${myProducts.length})` },
    { key: "sales", label: `Satışlarım (${myOrders.length})` },
  ] as const;

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Satıcı Paneli</h1>
              <p className="mt-3 text-gray-400">
                Ürün yükle, ürün durumlarını takip et ve satışlarını yönet.
              </p>
            </div>

            <div className="grid gap-2 md:text-right">
              <button
                onClick={() => user && loadSellerDashboard(user, false)}
                disabled={refreshing || !user}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>

              <div className="text-xs text-gray-500">
                {lastUpdated ? (
                  <span>Son güncelleme: {lastUpdated}</span>
                ) : (
                  <span>Canlı takip aktif</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-8 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            <p>{message}</p>

            {user && (
              <button
                onClick={() => loadSellerDashboard(user, false)}
                className="mt-4 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500"
              >
                Tekrar Dene
              </button>
            )}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:col-span-2">
            <p className="text-sm text-gray-400">Satıcı</p>
            <h2 className="mt-3 break-all text-xl font-bold">
              {user?.user_metadata?.full_name || user?.email}
            </h2>

            {user && (
              <a
                href={`/seller-store/${user.id}`}
                className="mt-4 inline-block rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
              >
                Mağazamı Gör
              </a>
            )}
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
            <p className="text-sm text-gray-400">Satış</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">{totalSales}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kazanç</p>
            <h2 className="mt-3 text-3xl font-bold">{formatMoney(totalRevenue)}</h2>
          </div>
        </section>

        <section className="relative mt-10 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Satıcı İşlemleri</h2>
              <p className="mt-2 text-sm text-gray-400">
                Aktif bölüm: {tabs.find((tab) => tab.key === activeTab)?.label}
              </p>
            </div>

            <button
              onClick={() => setSellerMenuOpen(!sellerMenuOpen)}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              {sellerMenuOpen ? "Kapat" : "☰ Satıcı Menü"}
            </button>
          </div>

          {sellerMenuOpen && (
            <div className="absolute left-0 right-0 top-28 z-40 rounded-3xl border border-white/10 bg-[#0B1020] p-5 shadow-2xl">
              <div className="grid gap-3 md:grid-cols-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSellerMenuOpen(false);
                    }}
                    className={
                      activeTab === tab.key
                        ? "rounded-2xl bg-blue-600 px-5 py-3 text-left text-sm font-semibold text-white"
                        : "rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-left text-sm font-semibold text-gray-200 hover:bg-white/10"
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {activeTab === "upload" && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
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
                <p className="mb-2 text-sm text-gray-400">Lisans türü</p>

                <select
                  value={licenseType}
                  onChange={(event) => setLicenseType(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                >
                  {productLicenses.map((license) => (
                    <option key={license.type} value={license.type}>
                      {license.type}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-gray-500">
                  {getLicenseInfo(licenseType).summary}
                </p>
              </label>

              <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div>
                  <h3 className="text-lg font-bold">Teknik Bilgiler</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Kod projeleri için demo, teknoloji ve kurulum bilgisi ekleyebilirsin.
                    PDF/slayt gibi ürünlerde boş bırakabilirsin.
                  </p>
                </div>

                <input
                  value={demoUrl}
                  onChange={(event) => setDemoUrl(event.target.value)}
                  placeholder="Canlı demo linki örnek: https://demo-site.com"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />

                <input
                  value={techStack}
                  onChange={(event) => setTechStack(event.target.value)}
                  placeholder="Teknolojiler örnek: Next.js, Tailwind, Supabase"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />

                <textarea
                  value={requirements}
                  onChange={(event) => setRequirements(event.target.value)}
                  placeholder="Gereksinimler örnek: Node.js 20, npm, Supabase hesabı"
                  className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />

                <textarea
                  value={setupNotes}
                  onChange={(event) => setSetupNotes(event.target.value)}
                  placeholder="Kurulum notları örnek: npm install, npm run dev"
                  className="min-h-36 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />
              </div>

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">Önizleme tipi</p>

                <select
                  value={previewType}
                  onChange={(event) => setPreviewType(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                >
                  {productPreviewTypes.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.type}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-gray-500">
                  {getPreviewInfo(previewType).description}
                </p>
              </label>

              <textarea
                value={previewNote}
                onChange={(event) => setPreviewNote(event.target.value)}
                placeholder="Önizleme açıklaması örnek: Bu ürün kapak görseli ve 3 ekran görüntüsüyle tanıtılır."
                className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">Kapak görseli</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event) => setCoverImage(event.target.files?.[0] || null)}
                  required
                  className="w-full text-sm text-gray-300"
                />
                <p className="mt-2 text-xs text-gray-500">
                  PNG, JPG veya WEBP formatında ürün görseli yükle.
                </p>
              </label>

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">Ürün dosyası</p>
                <input
                  type="file"
                  accept=".zip,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.json,application/zip,application/x-zip-compressed,application/pdf"
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
          </section>
        )}

        {activeTab === "products" && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Ürünlerim</h2>
            <p className="mt-2 text-sm text-gray-400">
              Eklediğin ürünleri ve admin onay durumlarını buradan takip edebilirsin.
            </p>

            <div className="mt-6 grid gap-4">
              {myProducts.map((product) => (
                <div key={product.id} className="rounded-2xl bg-black/30 p-5">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="mb-4 h-40 w-full rounded-2xl object-cover"
                    />
                  )}

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
                    Dosya: {product.file_path ? product.file_type || "Yüklendi" : "Henüz dosya yok"}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Lisans: {product.license_type || "Kişisel Kullanım"}
                  </p>

                  {product.tech_stack && (
                    <p className="mt-1 text-xs text-gray-500">
                      Teknolojiler: {product.tech_stack}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-gray-500">
                    Önizleme: {product.preview_type || "Kapak + Galeri"}
                  </p>

                  {product.demo_url && (
                    <a
                      href={product.demo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-blue-300 hover:text-blue-200"
                    >
                      Canlı demo aç
                    </a>
                  )}

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
                  </div>
                </div>
              ))}

              {myProducts.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-gray-400">
                  Henüz ürün eklemedin.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "sales" && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Satışlarım</h2>
            <p className="mt-2 text-sm text-gray-400">
              Ürünlerinden oluşan sipariş kayıtları burada görünür.
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
        )}
      </section>
    </main>
  );
}
