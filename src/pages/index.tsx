import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const products = [
  {
    title: "Modern E-Ticaret Sitesi",
    category: "Web Site",
    price: "₺1.499",
    description: "Hazır yönetim paneli, ürün sayfası ve modern tasarım.",
  },
  {
    title: "Kişisel Portfolio Scripti",
    category: "Frontend",
    price: "₺499",
    description: "Yazılımcılar ve freelancerlar için şık portfolio sistemi.",
  },
  {
    title: "Admin Panel Paketi",
    category: "Dashboard",
    price: "₺899",
    description: "Satış, kullanıcı ve proje yönetimi için sade panel arayüzü.",
  },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold">devcodstore</h1>
            <p className="text-sm text-gray-400">Kod, proje ve web sistemleri pazarı</p>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <a href="/products" className="text-sm text-gray-300 hover:text-white">
              Ürünler
            </a>

            <a href="/seller" className="text-sm text-gray-300 hover:text-white">
              Satıcı Ol
            </a>

            <a href="/about" className="text-sm text-gray-300 hover:text-white">
              Hakkımızda
            </a>

            <a href="/contact" className="text-sm text-gray-300 hover:text-white">
              İletişim
            </a>

            {user ? (
              <a
                href="/account"
                className="rounded-2xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-500"
              >
                Hesabım
              </a>
            ) : (
              <>
                <a href="/login" className="text-sm text-gray-300 hover:text-white">
                  Giriş Yap
                </a>

                <a href="/register" className="text-sm text-gray-300 hover:text-white">
                  Kayıt Ol
                </a>
              </>
            )}

            <a
              href="/admin"
              className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Admin
            </a>
          </div>
        </nav>

        <section className="grid gap-10 py-16 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300">
              Geliştiriciler için yeni nesil kod pazarı
            </p>

            <h2 className="max-w-2xl text-5xl font-bold leading-tight">
              Hazır projeleri keşfet, satın al veya kendi kodunu sat.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
              devcodstore; web sitesi, uygulama arayüzü, admin panel ve proje dosyalarının
              güvenli şekilde listelenip satılacağı modern bir platformdur.
            </p>

            <div className="mt-8 flex gap-4">
              <a
                href="/products"
                className="rounded-2xl bg-blue-600 px-7 py-3 font-semibold hover:bg-blue-500"
              >
                Ürünleri Keşfet
              </a>

              <a
                href="/seller"
                className="rounded-2xl border border-white/15 px-7 py-3 font-semibold hover:bg-white/10"
              >
                Satıcı Ol
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <h3 className="text-xl font-semibold">Pazar Paneli</h3>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Toplam Ürün</p>
                <p className="mt-2 text-3xl font-bold">128</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Satıcı Kazancı</p>
                <p className="mt-2 text-3xl font-bold">₺42.850</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Onay Bekleyen Projeler</p>
                <p className="mt-2 text-3xl font-bold">16</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-3xl font-bold">Öne Çıkan Ürünler</h3>
          <p className="mt-2 text-gray-400">Kod paketleri, paneller ve hazır web sistemleri.</p>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                  {product.category}
                </span>

                <h4 className="mt-5 text-xl font-semibold">{product.title}</h4>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {product.description}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-2xl font-bold">{product.price}</p>
                  <a
                    href="/products"
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                  >
                    İncele
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-8">
            <h3 className="text-3xl font-bold">devcodstore Nasıl Çalışır?</h3>
            <p className="mt-2 text-gray-400">
              Alıcılar hazır projeleri satın alır, satıcılar kendi kod paketlerini güvenli şekilde yayınlar.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl bg-black/30 p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold">
                1
              </div>
              <h4 className="text-xl font-bold">Projeyi Keşfet</h4>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Kullanıcılar web sitesi, admin panel, mobil arayüz ve hazır kod paketlerini inceler.
              </p>
            </div>

            <div className="rounded-3xl bg-black/30 p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold">
                2
              </div>
              <h4 className="text-xl font-bold">Güvenli Satın Al</h4>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Satın alma sonrası proje dosyası kullanıcının hesabına tanımlanır.
              </p>
            </div>

            <div className="rounded-3xl bg-black/30 p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold">
                3
              </div>
              <h4 className="text-xl font-bold">Dosyalarını İndir</h4>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Kullanıcı, aldığı projeye Dosyalarım ekranından erişir ve indirebilir.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
