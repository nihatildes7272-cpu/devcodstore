import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState("buyer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          account_type: accountType,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Kayıt başarılı. E-posta onayı gerekiyorsa mail kutunu kontrol et.");
    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">devcodstore</h1>
          <p className="mt-2 text-sm text-gray-400">
            Yeni hesap oluştur ve platforma katıl
          </p>
        </div>

        <form onSubmit={handleRegister} className="grid gap-4">
          <input
            type="text"
            placeholder="Ad Soyad"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-gray-500"
          />

          <input
            type="email"
            placeholder="E-posta adresi"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-gray-500"
          />

          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-gray-500"
          />

          <select
            value={accountType}
            onChange={(event) => setAccountType(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          >
            <option value="buyer">Alıcı hesabı</option>
            <option value="seller">Satıcı hesabı</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        {message && (
          <p className="mt-5 rounded-2xl bg-black/30 p-4 text-center text-sm text-gray-300">
            {message}
          </p>
        )}

        <div className="mt-6 text-center text-sm text-gray-400">
          Zaten hesabın var mı?{" "}
          <a href="/login" className="text-blue-400 hover:text-blue-300">
            Giriş yap
          </a>
        </div>

        <div className="mt-6 flex justify-center">
          <a href="/" className="text-sm text-gray-400 hover:text-white">
            Ana sayfaya dön
          </a>
        </div>
      </section>
    </main>
  );
}
