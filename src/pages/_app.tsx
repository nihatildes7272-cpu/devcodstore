import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function protectAdminRoutes() {
      if (!router.isReady) return;

      const isAdminRoute = router.pathname.startsWith("/admin");

      if (!isAdminRoute) {
        if (!cancelled) setCheckingAdmin(false);
        return;
      }

      if (!cancelled) setCheckingAdmin(true);

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        if (!cancelled) setCheckingAdmin(false);
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("account_type,email")
        .eq("id", userData.user.id)
        .maybeSingle();

      const isAdmin =
        profile?.account_type === "admin" ||
        userData.user.email === "nihatildes1@gmail.com";

      if (error || !isAdmin) {
        if (!cancelled) setCheckingAdmin(false);
        router.replace("/not-authorized");
        return;
      }

      if (!cancelled) setCheckingAdmin(false);
    }

    protectAdminRoutes();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.pathname]);

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Admin yetkisi kontrol ediliyor...
      </main>
    );
  }

  return <Component {...pageProps} />;
}
