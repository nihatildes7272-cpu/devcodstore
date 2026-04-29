import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import SiteFooter from "@/components/SiteFooter";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function protectAdminRoutes() {
      if (!router.isReady) return;

      const isAdminRoute = router.pathname.startsWith("/admin");

      if (!isAdminRoute) {
        if (!cancelled) {
          setCheckingAdmin(false);
          setAdminError("");
        }
        return;
      }

      if (!cancelled) {
        setCheckingAdmin(true);
        setAdminError("");
      }

      try {
        const userDataResult = await withTimeout(
          supabase.auth.getUser(),
          10000,
          "Admin kontrolü sırasında kullanıcı bilgisi geç geldi."
        );

        const user = userDataResult.data.user;

        if (!user) {
          if (!cancelled) setCheckingAdmin(false);
          router.replace("/login");
          return;
        }

        const profileResult = await withTimeout(
          supabase
            .from("profiles")
            .select("account_type,email")
            .eq("id", user.id)
            .maybeSingle(),
          10000,
          "Admin yetkisi kontrolü gecikti."
        );

        const profile = profileResult.data;

        const isAdmin =
          profile?.account_type === "admin" ||
          user.email === "nihatildes1@gmail.com";

        if (!isAdmin) {
          if (!cancelled) setCheckingAdmin(false);
          router.replace("/not-authorized");
          return;
        }

        if (!cancelled) {
          setCheckingAdmin(false);
          setAdminError("");
        }
      } catch (error) {
        if (!cancelled) {
          setCheckingAdmin(false);
          setAdminError(
            error instanceof Error
              ? error.message
              : "Admin yetkisi kontrol edilirken hata oluştu."
          );
        }
      }
    }

    protectAdminRoutes();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.pathname]);

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold">Admin yetkisi kontrol ediliyor...</h1>
          <p className="mt-3 text-sm text-gray-400">
            Sunucu yanıtı bekleniyor.
          </p>
        </section>
      </main>
    );
  }

  if (adminError && router.pathname.startsWith("/admin")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-bold">Admin paneli geç açıldı</h1>
          <p className="mt-3 text-sm text-red-200">{adminError}</p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
          >
            Tekrar Dene
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      <Component {...pageProps} />
      {!router.pathname.startsWith("/admin") && <SiteFooter />}
    </>
  );
}
