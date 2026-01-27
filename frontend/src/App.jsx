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
    // preventing multiple sessions from being attempted while loading
    if (starting === true) return;
    
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
      // Fallback: could support chat opening even if backend is down
      console.log("Error occurred. Check backend is available.")
    } finally {
      // allow retries if error occurs (e.g. backend still starting)
      setStarting(false);
    }
  };


  return (
    <div className="app-root">
      {screen === "landing" ? (
        <LandingPage onStart={startChat} starting={starting} />
      ) : (
        <ChatbotPage
          onBack={function() {
            const sessionId = session?.session_id;
            fetch(`http://localhost:5174/api/session/${sessionId}/kill-session`,
                  {
                  method: "POST",
                }
              ).catch(() => {});
            setScreen("landing")
            
            }
          }
          session={session}
        />
      )}
    </div>
  );
}

export default App;
