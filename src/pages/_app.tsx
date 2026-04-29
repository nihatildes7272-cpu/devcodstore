import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  useEffect(() => {
    async function protectAdminRoutes() {
      if (!router.isReady) return;

      const isAdminRoute = router.pathname.startsWith("/admin");

      if (!isAdminRoute) {
        setCheckingAdmin(false);
        return;
      }

      setCheckingAdmin(true);

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", userData.user.id)
        .maybeSingle();

      const roleFromProfile = profile?.account_type;
      const roleFromMetadata = userData.user.user_metadata?.account_type;

      const isAdmin = roleFromProfile === "admin" || roleFromMetadata === "admin";

      if (!isAdmin) {
        router.replace("/not-authorized");
        return;
      }

      setCheckingAdmin(false);
    }

    protectAdminRoutes();
  }, [router.isReady, router.pathname, router]);

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Admin yetkisi kontrol ediliyor...
      </main>
    );
  }

  return <Component {...pageProps} />;
}
