import { useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Merhaba! 👋 devcodstore'da sana nasıl yardımcı olabilirim? Ürünler, satıcı olmak veya destek hakkında sorular sorabilirsin.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    // API'ye göndermek için geçmiş mesajların formatını hazırlıyoruz
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history })
      });
      const data = await res.json();

      setMessages((prev) => [...prev, { 
        id: Date.now().toString(), 
        role: "assistant", 
        content: data.reply || "Bir hata oluştu." 
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Bağlantı hatası oluştu. Lütfen tekrar dene." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 flex h-[500px] max-h-[70vh] w-[350px] max-w-[90vw] flex-col overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-slate-900/95 to-slate-800/95 shadow-2xl backdrop-blur-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-sm shadow-lg">
                🤖
              </div>
              <div>
                <h3 className="font-bold text-white">devcodstore AI</h3>
                <p className="text-[10px] uppercase tracking-widest text-green-400">Çevrimiçi</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-md ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white/10 text-gray-200 border border-white/10 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-gray-400 border border-white/10 rounded-2xl rounded-bl-sm p-3 text-sm flex gap-1 items-center shadow-md">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="border-t border-white/10 bg-black/20 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Bir soru sor..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-blue-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                ➤
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-2xl shadow-xl shadow-blue-600/30 transition-all duration-300 hover:scale-110 active:scale-95 border border-white/20"
        >
          <span className="group-hover:animate-pulse">✨</span>
        </button>
      )}
    </div>
  );
}