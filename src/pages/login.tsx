export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">devcodstore</h1>
          <p className="mt-2 text-sm text-gray-400">
            Hesabına giriş yap ve paneline devam et
          </p>
        </div>

        <div className="grid gap-4">
          <input
            type="email"
            placeholder="E-posta adresi"
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-gray-500"
          />

          <input
            type="password"
            placeholder="Şifre"
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-gray-500"
          />

          <a
            href="/account"
            className="mt-2 rounded-2xl bg-blue-600 px-5 py-3 text-center font-semibold hover:bg-blue-500"
          >
            Giriş Yap
          </a>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          Hesabın yok mu?{" "}
          <a href="/register" className="text-blue-400 hover:text-blue-300">
            Kayıt ol
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
