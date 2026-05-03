import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AIChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Merhaba! devcodstore asistanına hoş geldin. Sana nasıl yardımcı olabilirim?" }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Yeni mesaj geldiğinde otomatik olarak en alta kaydır
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Boş mesaj gönderilmesini engelle (sadece boşluk karakteri varsa göndermez)
    if (!message.trim()) return;

    const userMsg = message.trim();
    setMessage(""); // Input'u temizle
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await response.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);

      // API'den bir yönlendirme adresi geldiyse, kullanıcıyı ilgili sayfaya yönlendir
      if (data.redirectUrl) {
        setTimeout(() => {
          router.push(data.redirectUrl);
          setIsOpen(false); // Yönlendirme sonrası sohbet penceresini otomatik kapat
        }, 2000); // Kullanıcının önce asistanın mesajını okuyabilmesi için 2 saniye beklet
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Üzgünüm, şu anda sistemsel bir yoğunluk var. Lütfen biraz sonra tekrar dene." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Sohbet Penceresi */}
      {isOpen && (
        <div className="mb-4 flex h-[450px] w-80 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0B1020] shadow-2xl transition-all sm:w-96">
          {/* Başlık */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
            <h3 className="font-bold text-white">devcodstore Asistan</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Mesajlar Alanı */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-gray-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {/* Yükleniyor / Yazıyor Animasyonu */}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                  <span>Yazıyor</span>
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"></span>
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Mesaj Gönderme Formu */}
          <form onSubmit={sendMessage} className="border-t border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bir soru sor..."
                className="flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-500/50"
              />
              <button
                type="submit"
                disabled={!message.trim() || loading}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-500 disabled:opacity-50"
              >
                ➤
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Açma/Kapatma Butonu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl text-white shadow-lg shadow-blue-600/30 transition-transform hover:scale-110 hover:bg-blue-500"
      >
        {isOpen ? "✕" : "💬"}
      </button>
    </div>
  );
}