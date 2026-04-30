import { useEffect, useMemo, useState } from "react";
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
  image_url?: string | null;
  security_status?: string | null;
  security_note?: string | null;
  security_checked_at?: string | null;
  created_at?: string;
};

type GalleryImage = {
  id: string;
  product_id: string;
  image_url: string;
  image_path: string;
  created_at?: string;
};

type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);

  const [hasPurchased, setHasPurchased] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingReview, setSavingReview] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  async function loadReviews(productId: string, currentUser?: User | null) {
    const { data, error } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      setReviewMessage("Yorumlar yüklenemedi: " + error.message);
      setReviews([]);
      return;
    }

    const reviewData = data || [];
    setReviews(reviewData);

    const myReview = currentUser
      ? reviewData.find((review) => review.user_id === currentUser.id)
      : null;

    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment);
    }
  }

  useEffect(() => {
    async function loadProduct() {
      if (!router.isReady || !id) return;

      setLoading(true);
      setMessage("");
      setReviewMessage("");

      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      setUser(currentUser);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", String(id))
        .single();

      if (error || !data) {
        setMessage("Ürün bilgisi yüklenirken hata oluştu.");
        setProduct(null);
        setLoading(false);
        return;
      }

      setProduct(data);

      const { data: galleryData } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", data.id)
        .order("created_at", { ascending: true });

      setGalleryImages(galleryData || []);

      const { data: relatedData } = await supabase
        .from("products")
        .select("*")
        .eq("status", "Yayında")
        .eq("category", data.category)
        .neq("id", data.id)
        .limit(3);

      setRelatedProducts(relatedData || []);

      if (currentUser) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("product_id", data.id)
          .neq("status", "İade Edildi")
          .limit(1)
          .maybeSingle();

        setHasPurchased(Boolean(orderData));
      } else {
        setHasPurchased(false);
      }

      await loadReviews(data.id, currentUser);

      setLoading(false);
    }

    loadProduct();
  }, [router.isReady, id]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  const myReview = user
    ? reviews.find((review) => review.user_id === user.id)
    : null;

  async function addToCart(productId: string) {
    try {
      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        const { error } = await supabase.from("cart_items").upsert({
          user_id: userData.user.id,
          product_id: productId,
        });

        if (error) {
          alert("Sepete eklenirken hata oluştu: " + error.message);
          return;
        }

        window.dispatchEvent(new Event("devcodstore-cart-updated"));
        router.push("/cart");
        return;
      }

      const rawCart = localStorage.getItem("devcodstore_cart");
      const cartItems = rawCart ? JSON.parse(rawCart) : [];
      const safeCartItems = Array.isArray(cartItems) ? cartItems : [];

      if (!safeCartItems.includes(productId)) {
        safeCartItems.push(productId);
      }

      localStorage.setItem("devcodstore_cart", JSON.stringify(safeCartItems));
      window.dispatchEvent(new Event("devcodstore-cart-updated"));
      router.push("/cart");
    } catch {
      alert("Sepete eklenirken hata oluştu.");
    }
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();

    if (!user || !product) {
      setReviewMessage("Yorum yapmak için giriş yapmalısın.");
      return;
    }

    if (!hasPurchased) {
      setReviewMessage("Yorum yapabilmek için bu ürünü satın almış olmalısın.");
      return;
    }

    if (!comment.trim()) {
      setReviewMessage("Yorum alanı boş olamaz.");
      return;
    }

    setSavingReview(true);
    setReviewMessage("");

    const authorName =
      user.user_metadata?.full_name ||
      user.email ||
      "Kullanıcı";

    const { error } = await supabase
      .from("product_reviews")
      .upsert(
        {
          product_id: product.id,
          user_id: user.id,
          author_name: authorName,
          rating,
          comment: comment.trim(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "product_id,user_id",
        }
      );

    setSavingReview(false);

    if (error) {
      setReviewMessage("Yorum kaydedilemedi: " + error.message);
      return;
    }

    setReviewMessage("Yorumun kaydedildi.");
    await loadReviews(product.id, user);
  }

  async function deleteReview(reviewId: string) {
    const confirmed = window.confirm("Yorumunu silmek istiyor musun?");

    if (!confirmed || !product) return;

    const { error } = await supabase
      .from("product_reviews")
      .delete()
      .eq("id", reviewId);

    if (error) {
      setReviewMessage("Yorum silinemedi: " + error.message);
      return;
    }

    setComment("");
    setRating(5);
    setReviewMessage("Yorum silindi.");
    await loadReviews(product.id, user);
  }

  function formatDate(date?: string) {
    if (!date) return "Tarih yok";

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function fileName(path: string | null) {
    if (!path) return "ZIP dosyası yok";
    return path.split("/").pop() || "proje-dosyasi.zip";
  }

  function securityClass(status?: string | null) {
    if (status === "Güvenli") {
      return "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "Riskli") {
      return "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    if (status === "Manuel İnceleme") {
      return "rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300";
    }

    return "rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
  }

  function statusClass(status: string) {
    if (status === "Yayında") {
      return "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "Onay Bekliyor") {
      return "rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
    }

    if (status === "Reddedildi") {
      return "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    return "rounded-full bg-gray-500/20 px-4 py-2 text-sm text-gray-300";
  }

  function stars(value: number) {
    const rounded = Math.round(value);
    return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Ürün yükleniyor...
      </main>
    );
  }

  if (message || !product) {
    return (
      <main className="min-h-screen bg-[#070A12] text-white">
        <section className="mx-auto max-w-7xl px-6 py-10">
          <SiteNavbar />

          <div className="flex min-h-[60vh] items-center justify-center">
            <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
              <h1 className="text-3xl font-bold">Ürün bulunamadı</h1>
              <p className="mt-4 text-red-200">
                {message || "Bu ürün veritabanında bulunamadı."}
              </p>

              <a
                href="/products"
                className="mt-8 inline-block rounded-2xl bg-white px-5 py-3 font-semibold text-black"
              >
                Ürünlere Dön
              </a>
            </section>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="h-80 w-full object-cover"
            />
          ) : (
            <div className="flex h-80 w-full items-center justify-center bg-black/30 text-gray-500">
              Ürün görseli yok
            </div>
          )}

          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300">
                  {product.category}
                </span>

                <span className={statusClass(product.status)}>
                  {product.status}
                </span>

                <span className={securityClass(product.security_status)}>
                  Güvenlik: {product.security_status || "Taranmadı"}
                </span>

                {reviews.length > 0 && (
                  <span className="rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300">
                    {stars(averageRating)} {averageRating.toFixed(1)}
                  </span>
                )}
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
                {product.title}
              </h1>

              <p className="mt-4 text-gray-400">
                Satıcı:{" "}
                {product.seller_id ? (
                  <a
                    href={`/seller-store/${product.seller_id}`}
                    className="font-semibold text-blue-300 hover:text-blue-200"
                  >
                    {product.seller}
                  </a>
                ) : (
                  <span className="font-semibold text-white">{product.seller}</span>
                )}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-6 md:min-w-72">
              <p className="text-sm text-gray-400">Fiyat</p>
              <h2 className="mt-2 text-5xl font-bold">{product.price}</h2>

              <p className="mt-4 text-sm leading-6 text-gray-400">
                Satın alma sonrası ürün “Dosyalarım” sayfana tanımlanır.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold">Ürün Açıklaması</h2>

              <p className="mt-5 leading-8 text-gray-300">
                {product.description || "Bu ürün için henüz açıklama eklenmemiş."}
              </p>
            </div>

            {galleryImages.length > 0 && (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="text-2xl font-bold">Ürün Galerisi</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Ürüne ait ekran görüntüleri ve ön izleme görselleri.
                </p>

                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  {galleryImages.map((image) => (
                    <a
                      key={image.id}
                      href={image.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-3xl border border-white/10 bg-black/30 transition hover:border-blue-500/40"
                    >
                      <img
                        src={image.image_url}
                        alt="Ürün galeri görseli"
                        className="h-56 w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold">Ürün Bilgileri</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Ürün No</p>
                  <p className="mt-2 break-all font-bold">#{product.id}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Kategori</p>
                  <p className="mt-2 font-bold">{product.category}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Yayın Durumu</p>
                  <p className="mt-2 font-bold">{product.status}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Eklenme Tarihi</p>
                  <p className="mt-2 font-bold">{formatDate(product.created_at)}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5 md:col-span-2">
                  <p className="text-sm text-gray-400">Dosya Durumu</p>
                  <p className="mt-2 break-all font-bold">
                    {product.file_path ? "ZIP dosyası hazır" : "Henüz ZIP dosyası yok"}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {fileName(product.file_path)}
                  </p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5 md:col-span-2">
                  <p className="text-sm text-gray-400">Admin Güvenlik İncelemesi</p>
                  <p className="mt-2 font-bold">
                    {product.security_status || "Taranmadı"}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {product.security_note || "Bu ürün için henüz güvenlik notu eklenmemiş."}
                  </p>
                </div>
              </div>
            </div>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Yorumlar ve Puanlama</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    Satın alan kullanıcılar bu ürüne yorum ve puan verebilir.
                  </p>
                </div>

                <div className="rounded-2xl bg-black/30 px-5 py-3 text-sm">
                  {reviews.length > 0 ? (
                    <span className="text-yellow-300">
                      {stars(averageRating)} {averageRating.toFixed(1)} / 5
                    </span>
                  ) : (
                    <span className="text-gray-400">Henüz yorum yok</span>
                  )}
                </div>
              </div>

              {reviewMessage && (
                <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
                  {reviewMessage}
                </div>
              )}

              {user && hasPurchased ? (
                <form onSubmit={submitReview} className="mt-8 grid gap-4 rounded-3xl bg-black/30 p-5">
                  <h3 className="text-xl font-bold">
                    {myReview ? "Yorumunu Güncelle" : "Yorum Yap"}
                  </h3>

                  <select
                    value={rating}
                    onChange={(event) => setRating(Number(event.target.value))}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  >
                    <option value={5}>5 yıldız</option>
                    <option value={4}>4 yıldız</option>
                    <option value={3}>3 yıldız</option>
                    <option value={2}>2 yıldız</option>
                    <option value={1}>1 yıldız</option>
                  </select>

                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Ürün hakkındaki deneyimini yaz..."
                    className="min-h-32 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                  />

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingReview}
                      className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
                    >
                      {savingReview ? "Kaydediliyor..." : "Yorumu Kaydet"}
                    </button>

                    {myReview && (
                      <button
                        type="button"
                        onClick={() => deleteReview(myReview.id)}
                        className="rounded-2xl border border-red-500/30 px-5 py-3 font-semibold text-red-200 hover:bg-red-500/10"
                      >
                        Yorumu Sil
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="mt-8 rounded-3xl bg-black/30 p-5 text-sm text-gray-400">
                  {!user
                    ? "Yorum yapmak için giriş yapmalısın."
                    : "Yorum yapabilmek için bu ürünü satın almış olmalısın."}
                </div>
              )}

              <div className="mt-8 grid gap-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-3xl bg-black/30 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-bold">{review.author_name}</h3>
                        <p className="mt-1 text-sm text-yellow-300">
                          {stars(review.rating)} {review.rating}/5
                        </p>
                      </div>

                      <p className="text-sm text-gray-500">
                        {formatDate(review.created_at)}
                      </p>
                    </div>

                    <p className="mt-4 leading-7 text-gray-300">
                      {review.comment}
                    </p>
                  </div>
                ))}

                {reviews.length === 0 && (
                  <div className="rounded-3xl bg-black/30 p-6 text-center text-gray-400">
                    Bu ürün için henüz yorum yapılmamış.
                  </div>
                )}
              </div>
            </section>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold">Satın Alma Güvencesi</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-black/30 p-5">
                  <h3 className="font-bold text-green-300">Erişim Kontrolü</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Dosya indirme sadece satın alan kullanıcıya açılır.
                  </p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <h3 className="font-bold text-blue-300">Admin Onayı</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Yayındaki ürünler admin kontrolünden geçer.
                  </p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <h3 className="font-bold text-purple-300">Dijital Teslimat</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Satın alma sonrası Dosyalarım bölümünden erişim sağlanır.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm text-gray-400">Toplam Tutar</p>
            <h3 className="mt-3 text-5xl font-bold">{product.price}</h3>

            <div className="mt-6 rounded-2xl bg-black/30 p-5">
              <p className="text-sm text-gray-400">Satıcı</p>

              {product.seller_id ? (
                <a
                  href={`/seller-store/${product.seller_id}`}
                  className="mt-2 block font-bold text-blue-300 hover:text-blue-200"
                >
                  {product.seller}
                </a>
              ) : (
                <p className="mt-2 font-bold">{product.seller}</p>
              )}

              <p className="mt-4 text-sm text-gray-400">Dosya</p>
              <p
                className={
                  product.file_path
                    ? "mt-2 font-bold text-green-300"
                    : "mt-2 font-bold text-yellow-300"
                }
              >
                {product.file_path ? "Hazır" : "Bekleniyor"}
              </p>

              <p className="mt-4 text-sm text-gray-400">Güvenlik</p>
              <p
                className={
                  product.security_status === "Güvenli"
                    ? "mt-2 font-bold text-green-300"
                    : product.security_status === "Riskli"
                    ? "mt-2 font-bold text-red-300"
                    : "mt-2 font-bold text-yellow-300"
                }
              >
                {product.security_status || "Taranmadı"}
              </p>

              <p className="mt-4 text-sm text-gray-400">Puan</p>
              <p className="mt-2 font-bold text-yellow-300">
                {reviews.length > 0
                  ? `${stars(averageRating)} ${averageRating.toFixed(1)}`
                  : "Henüz puan yok"}
              </p>
            </div>

            <div className="mt-8 grid gap-3">
              <button
                type="button"
                onClick={() => addToCart(product.id)}
                className="rounded-2xl bg-blue-600 px-5 py-4 text-center font-semibold hover:bg-blue-500"
              >
                Sepete Ekle
              </button>

              <a
                href={`/checkout/${product.id}`}
                className="rounded-2xl bg-white px-5 py-4 text-center font-semibold text-black hover:bg-gray-200"
              >
                Hemen Satın Al
              </a>

              <a
                href="/products"
                className="rounded-2xl border border-white/15 px-5 py-4 text-center font-semibold hover:bg-white/10"
              >
                Ürünlere Dön
              </a>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-gray-500">
              Gerçek ödeme entegrasyonu PayTR onayından sonra bağlanacak.
            </p>
          </aside>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Benzer Ürünler</h2>
              <p className="mt-2 text-sm text-gray-400">
                Aynı kategorideki diğer yayındaki ürünler
              </p>
            </div>

            <a href="/products" className="text-sm text-gray-400 hover:text-white">
              Tümünü gör
            </a>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {relatedProducts.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-white/10 bg-black/30 p-6"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="mb-5 h-40 w-full rounded-2xl object-cover"
                  />
                )}

                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                  {item.category}
                </span>

                <h3 className="mt-5 text-xl font-bold">{item.title}</h3>

                <p className="mt-2 text-sm text-gray-400">
                  Satıcı: {item.seller}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-2xl font-bold">{item.price}</p>

                  <a
                    href={`/product/${item.id}`}
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
                  >
                    İncele
                  </a>
                </div>
              </div>
            ))}

            {relatedProducts.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-gray-400 md:col-span-3">
                Bu kategoride başka yayındaki ürün yok.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
