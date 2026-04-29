import type { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";
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
  image_url: string | null;
  created_at?: string;
};

type SellerStorePageProps = {
  sellerId: string;
  sellerName: string;
  products: Product[];
  errorMessage: string;
};

export default function SellerStorePage({
  sellerId,
  sellerName,
  products,
  errorMessage,
}: SellerStorePageProps) {
  const categoryStats = products.reduce<Record<string, number>>((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});

  const categoryList = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-3 w-fit rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300">
                Satıcı Mağazası
              </p>

              <h1 className="text-4xl font-bold">{sellerName}</h1>

              <p className="mt-3 max-w-2xl text-gray-400">
                Bu mağazada satıcının admin onayından geçmiş ve yayında olan dijital
                yazılım ürünleri listelenir.
              </p>

              <p className="mt-3 break-all text-xs text-gray-500">
                Satıcı ID: {sellerId}
              </p>
            </div>

            <div className="grid gap-3 md:min-w-72">
              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Yayındaki Ürün</p>
                <h2 className="mt-2 text-4xl font-bold">{products.length}</h2>
              </div>

              <a
                href="/products"
                className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-black"
              >
                Tüm Ürünlere Dön
              </a>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Ürün</p>
            <h2 className="mt-3 text-4xl font-bold">{products.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Kategori Sayısı</p>
            <h2 className="mt-3 text-4xl font-bold">{categoryList.length}</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Mağaza Durumu</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">Aktif</h2>
          </div>
        </section>

        {categoryList.length > 0 && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Kategori Dağılımı</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {categoryList.map(([category, count]) => (
                <div key={category} className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">{category}</p>
                  <p className="mt-2 text-2xl font-bold">{count} ürün</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Satıcının Ürünleri</h2>
              <p className="mt-2 text-gray-400">
                Sadece “Yayında” durumundaki ürünler gösterilir.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-black/30"
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 w-full items-center justify-center bg-black/40 text-gray-500">
                    Görsel yok
                  </div>
                )}

                <div className="p-6">
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                    {product.category}
                  </span>

                  <h3 className="mt-5 text-2xl font-bold">{product.title}</h3>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-400">
                    {product.description || "Bu ürün için açıklama eklenmemiş."}
                  </p>

                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-3xl font-bold">{product.price}</p>

                    <a
                      href={`/product/${product.id}`}
                      className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
                    >
                      İncele
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-8 text-center">
              <h3 className="text-2xl font-bold">Yayında ürün yok</h3>
              <p className="mt-2 text-gray-400">
                Bu satıcının şu anda yayında ürünü bulunmuyor.
              </p>

              <a
                href="/products"
                className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
              >
                Ürünleri Keşfet
              </a>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<SellerStorePageProps> = async (
  context
) => {
  const sellerId = String(context.params?.id || "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      props: {
        sellerId,
        sellerName: "Satıcı",
        products: [],
        errorMessage:
          "Supabase bağlantı bilgileri eksik. Vercel Environment Variables kontrol edilmeli.",
      },
    };
  }

  const serverSupabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await serverSupabase
    .from("products")
    .select("id,title,category,price,seller,seller_id,status,description,image_url,created_at")
    .eq("seller_id", sellerId)
    .eq("status", "Yayında")
    .order("created_at", { ascending: false })
    .limit(100);

  const products = data || [];
  const sellerName = products[0]?.seller || "Satıcı";

  return {
    props: {
      sellerId,
      sellerName,
      products,
      errorMessage: error ? "Satıcı ürünleri yüklenemedi: " + error.message : "",
    },
  };
};
