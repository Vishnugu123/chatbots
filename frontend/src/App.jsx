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

  // Lead / callback states
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function sendMessage(customMessage = null, leadData = null) {
    const userMessage = (customMessage ?? input).trim();

    if (!userMessage || loading) return;

    // Add user message to chat
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

          // Send lead details only when available
          name: leadData?.name || null,
          email: leadData?.email || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Server error");
      }

      const data = await response.json();

      // Add bot response
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.reply,
        },
      ]);

      // Lead successfully sent to n8n
      if (data.lead_sent) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "✅ Your callback request has been submitted successfully. Our team will contact you soon.",
          },
        ]);

        setShowLeadForm(false);
        setName("");
        setEmail("");
      }
    } catch (error) {
      console.error("Chat error:", error);

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

async function handleCallbackSubmit() {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  if (!trimmedName || !trimmedEmail || loading) {
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("http://127.0.0.1:8000/lead", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: trimmedName,
        email: trimmedEmail,
        message: "Callback requested from ShopEase AI chatbot",
      }),
    });

    if (!response.ok) {
      throw new Error("Lead submission failed");
    }

    const data = await response.json();

    if (data.success) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "✅ Your callback request has been submitted successfully. Our team will contact you soon.",
        },
      ]);

      setShowLeadForm(false);
      setName("");
      setEmail("");
    } else {
      throw new Error("Lead was not submitted");
    }

  } catch (error) {

    console.error("Lead submission error:", error);

    setMessages((prev) => [
      ...prev,
      {
        role: "bot",
        text: "Sorry, we couldn't submit your callback request. Please try again.",
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
    setName("");
    setEmail("");
    setShowLeadForm(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">

      <div className="w-full max-w-2xl h-[700px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">

        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-5">

          <div className="flex items-center justify-between">

            {/* Logo / Title */}
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

            {/* Header buttons */}
            <div className="flex items-center gap-2">

              <button
                onClick={() => setShowLeadForm(true)}
                disabled={loading}
                className="text-xs text-slate-300 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-40"
              >
                Callback
              </button>

              <button
                onClick={clearChat}
                className="text-xs text-slate-300 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/10"
              >
                Clear
              </button>

            </div>

          </div>

        </div>


        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">

          {/* Callback Form */}
          {showLeadForm && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">

              <div className="flex items-start justify-between mb-4">

                <div>
                  <h2 className="font-semibold text-slate-800">
                    Request a Callback
                  </h2>

                  <p className="text-xs text-slate-400 mt-1">
                    Enter your details and our team will contact you.
                  </p>
                </div>

                <button
                  onClick={() => setShowLeadForm(false)}
                  disabled={loading}
                  className="text-slate-400 hover:text-slate-700 text-lg disabled:opacity-40"
                >
                  ✕
                </button>

              </div>


              <div className="space-y-3">

                {/* Name */}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-100"
                />

                {/* Email */}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-100"
                />

                {/* Submit */}
                <button
                  onClick={handleCallbackSubmit}
                  disabled={
                    loading ||
                    !name.trim() ||
                    !email.trim()
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Submitting..."
                    : "Submit Callback Request"}
                </button>

              </div>

            </div>
          )}


          {/* Chat messages */}
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
          {messages.length === 1 && !loading && !showLeadForm && (
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