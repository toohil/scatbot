// src/App.jsx
import { useState } from "react";
import LandingPage from "./LandingPage";
import ChatbotPage from "./ChatbotPage";
import "./App.css";

function App() {
  const [screen, setScreen] = useState("landing"); // "landing" | "chat"
  const [session, setSession] = useState(null);
  const [starting, setStarting] = useState(false);

  const startChat = async () => {
  setStarting(true);

  try {
    // Try create a session on the backend (stored in MySQL)
    const res = await fetch("http://localhost:5174/api/session", {
      method: "POST",
    });

    if (!res.ok) throw new Error("Failed to create session");

    const data = await res.json(); // { session_id, created_at, last_seen }
    setSession({ ...data, offline: false });
    setScreen("chat");
  } catch (e) {
    // Fallback: allow chat to open even if backend is down
    const localId =
      (globalThis.crypto && crypto.randomUUID && crypto.randomUUID()) ||
      `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setSession({ session_id: localId, offline: true });
    setScreen("chat");
  } finally {
    setStarting(false);
  }
};


  return (
    <div className="app-root">
      {screen === "landing" ? (
        <LandingPage onStart={startChat} starting={starting} />
      ) : (
        <ChatbotPage
          onBack={() => setScreen("landing")}
          session={session}
        />
      )}
    </div>
  );
}

export default App;
