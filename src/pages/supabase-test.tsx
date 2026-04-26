import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SupabaseTestPage() {
  const [status, setStatus] = useState("Kontrol ediliyor...");

  useEffect(() => {
    async function checkConnection() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setStatus("Supabase bağlantısında hata var.");
        return;
      }

      setStatus("Supabase bağlantısı başarılı.");
      console.log("Session:", data.session);
    }

    checkConnection();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <h1 className="text-3xl font-bold">Supabase Test</h1>

        <p className="mt-4 text-lg text-gray-300">{status}</p>

        <div className="mt-8">
          <a
            href="/"
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black"
          >
            Ana Sayfaya Dön
          </a>
        </div>
      </section>
    </main>
  );
}
