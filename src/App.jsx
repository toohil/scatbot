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
    try {
      setStarting(true);

      // Call your backend (running on 5174)
      const res = await fetch("http://localhost:5174/api/session", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to create session");

      const data = await res.json();
      setSession(data);
      setScreen("chat");
    } catch (e) {
      alert("Couldn’t start a session. Is the server running?");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="app-root">
      {screen === "landing" ? (
        <LandingPage onStart={startChat} starting={starting} />
      ) : (
        <ChatbotPage onBack={() => setScreen("landing")} session={session} />
      )}
    </div>
  );
}

export default App;
