import { useState } from "react";

const suggestions = [
  "How long does standard delivery take?",
  "What is the return policy?",
  "Can I cancel my order?",
];

function App() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! 👋 I'm ShopEase AI. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(customMessage = null) {
    const userMessage = (customMessage ?? input).trim();

    if (!userMessage || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userMessage,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Server error");
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.reply,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Sorry, I'm unable to connect to the ShopEase support server right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([
      {
        role: "bot",
        text: "Hi! 👋 I'm ShopEase AI. How can I help you today?",
      },
    ]);
    setInput("");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">

      <div className="w-full max-w-2xl h-[700px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">

        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-5">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-2xl">
                🛍️
              </div>

              <div>
                <h1 className="text-xl font-semibold">
                  ShopEase AI
                </h1>

                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Online • AI Customer Support
                </div>
              </div>

            </div>

            <button
              onClick={clearChat}
              className="text-xs text-slate-300 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/10"
            >
              Clear
            </button>

          </div>

        </div>


        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">

          {messages.map((message, index) => (

            <div
              key={index}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              <div
                className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  message.role === "user"
                    ? "bg-slate-900 text-white rounded-br-md"
                    : "bg-white text-slate-800 shadow-sm border border-slate-200 rounded-bl-md"
                }`}
              >
                {message.text}
              </div>

            </div>

          ))}


          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">

              <div className="bg-white border border-slate-200 shadow-sm px-4 py-3 rounded-2xl rounded-bl-md">

                <div className="flex items-center gap-1">

                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>

                  <span
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  ></span>

                  <span
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  ></span>

                </div>

              </div>

            </div>
          )}


          {/* Suggestions */}
          {messages.length === 1 && !loading && (
            <div className="pt-3">

              <p className="text-xs text-slate-400 mb-3">
                Try asking:
              </p>

              <div className="flex flex-wrap gap-2">

                {suggestions.map((question) => (

                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-slate-400 hover:text-slate-900 transition"
                  >
                    {question}
                  </button>

                ))}

              </div>

            </div>
          )}

        </div>


        {/* Input */}
        <div className="p-4 border-t border-slate-200 bg-white">

          <div className="flex gap-2">

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask ShopEase anything..."
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-100"
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>

          </div>

          <p className="text-center text-[11px] text-slate-400 mt-2">
            ShopEase AI • Powered by RAG & Gemini
          </p>

        </div>

      </div>

    </div>
  );
}

export default App;