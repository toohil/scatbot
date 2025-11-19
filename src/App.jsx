// src/App.jsx
import { useState } from "react";
import LandingPage from "./LandingPage";
import ChatbotPage from "./ChatbotPage";
import "./App.css";

function App() {
  const [screen, setScreen] = useState("landing"); // "landing" | "chat"

  return (
    <div className="app-root">
      {screen === "landing" ? (
        <LandingPage onStart={() => setScreen("chat")} />
      ) : (
        <ChatbotPage onBack={() => setScreen("landing")} />
      )}
    </div>
  );
}

export default App;
