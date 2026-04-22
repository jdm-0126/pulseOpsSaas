import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "What is my total revenue?",
  "How many events were processed?",
  "What is my most common event type?"
];

export function AiAssistant() {
  const { apiFetch } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setMessages(m => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const { answer } = await res.json();
      setMessages(m => [...m, { role: "assistant", text: answer }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: "fixed", bottom: 24, right: 24,
        width: 52, height: 52, borderRadius: "50%",
        background: "var(--accent)", border: "none",
        color: "#fff", fontSize: 22, zIndex: 200,
        boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {open ? "✕" : "✦"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 24,
          width: 340, maxHeight: 480,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, display: "flex", flexDirection: "column",
          zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8
          }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <span style={{ fontWeight: 600 }}>AI Assistant</span>
            <span className="badge badge-info" style={{ marginLeft: "auto" }}>GPT-4o mini</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && (
              <div>
                <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>
                  Ask anything about your data:
                </p>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => ask(s)} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "7px 10px", marginBottom: 6,
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 6, color: "var(--muted)", fontSize: 12,
                    cursor: "pointer"
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "8px 12px",
                borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                background: m.role === "user" ? "var(--accent)" : "var(--bg)",
                border: m.role === "assistant" ? "1px solid var(--border)" : "none",
                color: m.role === "user" ? "#fff" : "var(--text)",
                fontSize: 13, lineHeight: 1.5
              }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: "flex-start", padding: "8px 12px",
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: "12px 12px 12px 2px", color: "var(--muted)", fontSize: 13
              }}>
                Thinking…
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1, fontSize: 13, padding: "7px 10px" }}
              placeholder="Ask about your data…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && ask(input)}
              disabled={loading}
            />
            <button className="btn btn-primary" style={{ padding: "7px 12px", fontSize: 13 }}
              onClick={() => ask(input)} disabled={loading || !input.trim()}>
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
