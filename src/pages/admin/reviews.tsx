import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type Review = {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

type Product = {
  id: string;
  title: string;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadReviews() {
    setLoading(true);
    setMessage("");

    const { data: reviewData, error: reviewError } = await supabase
      .from("product_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: productData } = await supabase
      .from("products")
      .select("id,title");

    if (reviewError) {
      setMessage("Yorumlar yüklenemedi: " + reviewError.message);
      setReviews([]);
    } else {
      setReviews(reviewData || []);
    }

    setProducts(productData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function deleteReview(reviewId: string) {
    const confirmed = window.confirm("Bu yorumu silmek istiyor musun?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("product_reviews")
      .delete()
      .eq("id", reviewId);

    if (error) {
      setMessage("Yorum silinemedi: " + error.message);
      return;
    }

    await loadReviews();
  }

  function productTitle(productId: string) {
    return products.find((product) => product.id === productId)?.title || "Ürün";
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

  function stars(value: number) {
    return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Yorumlar yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-transparent p-8 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Yorum Yönetimi</h1>
              <p className="mt-3 text-gray-400">
                Kullanıcıların ürünlere yaptığı yorumları görüntüle ve uygunsuz olanları sil.
              </p>
            </div>

            <button
              onClick={loadReviews}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:scale-105 active:scale-95"
            >
              Yenile
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {[
            { label: "Toplam Yorum", value: reviews.length, color: "text-white" },
            { label: "Ortalama Puan", value: reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "0.0", color: "text-yellow-400" },
            { label: "Yönetim Durumu", value: "Aktif", color: "text-green-400" },
          ].map((stat, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
              <h2 className={`mt-3 text-4xl font-black ${stat.color}`}>{stat.value}</h2>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <h2 className="text-2xl font-black tracking-tight mb-8">Yorum Listesi</h2>

          <div className="mt-6 grid gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="group rounded-3xl border border-white/5 bg-white/5 p-6 transition hover:bg-white/[0.08]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-xl font-black group-hover:text-blue-300 transition-colors">{productTitle(review.product_id)}</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Yorum yapan: {review.author_name}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      Tarih: {formatDate(review.created_at)}
                    </p>
                    <p className="mt-2 text-yellow-300">
                      {stars(review.rating)} {review.rating}/5
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <a
                      href={`/product/${review.product_id}`}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-black transition hover:scale-105 active:scale-95"
                    >
                      Ürünü Aç
                    </a>

                    <button
                      onClick={() => deleteReview(review.id)}
                      className="rounded-2xl border border-red-500/30 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/10"
                    >
                      Yorumu Sil
                    </button>
                  </div>
                </div>

                <p className="mt-5 leading-7 text-gray-300">{review.comment}</p>
              </div>
            ))}

            {reviews.length === 0 && (
              <div className="rounded-3xl bg-black/30 p-8 text-center text-gray-400">
                Henüz yorum yok.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
