// src/ChatbotPage.jsx
import { useState } from "react";
import { useEffect, useRef } from "react";
import { getChatbotStatus, getChatbotResponse } from "../server/chatfunctions.js"

function ChatbotPage({ onBack, session }) {

  var msg_count = 0
  const [messages, setMessages] = useState(() => [
    {
      id: `bot-0`,
      sender: "bot",
      text: "Give me a question",
    },
  ]);
  
  const handleNext = () => {
    // reimplement this - some prompt engineer to get "next step" from chatbot.
    // piggyback on main handleQuery method
    console.log("Registered request")
  };

  const handleMoreInfo = () => {
    // reimplement this - prompt engineer to get "more info" from chatbot.
    // piggyback on main handleQuery method
    console.log("Registered request")
  };

  const handleFaqSelect = (index) => {
    // likely remove, don't think chatbot will produce a useful output.
    // we could implement it later by training on transcript/chatlogs
  };

  const handleQuery = () => {
    // how should this work?
    // need to fire off information - implement some sort of loading animation - then retrieve.
    const text_input = document.getElementById('freeTextInput');
    if (getChatbotStatus() == true) {
      console.log(text_input);
      const response = getChatbotResponse(text_input)
      setMessages((prev) => [
          ...prev,
          {
            id: `user-${msg_count}`,
            sender: "user",
            text: text_input,
          },
          {
            id: `bot-${msg_count+1}`,
            sender: "bot",
            text: response,
          },
        ]);
      msg_count++;
    } else {
      console.log("Awaiting model.")
    }
  }
  // will also need to handle reading response

const lastSavedIndexRef = useRef(0);
const bottomRef = useRef(null);

// useEffect(() => {
//   // You must have the session id available (passed from App)
//   const sessionId = session?.session_id;
//   if (!sessionId) return;

//   // Only send messages that were added since last time
//   const newMessages = messages.slice(lastSavedIndexRef.current);
//   if (newMessages.length === 0) return;

//   const sendOne = async (msg) => {
  
//     const role =
//       msg.sender === "user" || msg.role === "user" ? "user" : "bot";

//     const content =
//       msg.text ??
//       msg.content ??
//       msg.message ??
//       (typeof msg === "string" ? msg : JSON.stringify(msg));

//     // Fire-and-forget: don’t block the UI
//     fetch(`http://localhost:5174/api/session/${sessionId}/message`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ role, content }),
//     }).catch(() => {});
//   };

//   // Send all new messages
//   newMessages.forEach(sendOne);

//   // Mark them as saved (so we don’t resend)
//   lastSavedIndexRef.current = messages.length;
// }, [messages, session]);

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

  return (
    <div className="chat-page">
      <header className="chat-header">
        <button className="link-button" type="button" onClick={onBack}>
          ← Back to information
        </button>
        <div className="chat-title-block">
          <h1 className="chat-title">Chat assistant</h1>
          <p className="chat-subtitle">
            We’ll walk through the instructions step by step.
          </p>
        </div>
        {/* <div className="progress">
          Step {currentIndex + 1} of {totalSteps}
        </div> */}
      </header>

      <main className="chat-layout">
        <section className="chat-window">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.sender === "bot" ? "message message-bot" : "message message-user"
              }
            >
              <p className="message-text">
                {msg.text.split("\n").map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </section>

        <section className="chat-controls">
          <div className="input-row">
            <input
              className="text-input"
              type="text"
              placeholder="Enter text."
              id="freeTextInput"
            />
            <button className="chip" type="button" onClick={handleQuery}>
              Go
            </button>
          </div>          

          {/* {!atEnd ? (
            <div className="quick-replies">
              <button className="chip" type="button" onClick={handleNext}>
                 Next
              </button>
              <button className="chip" type="button" onClick={handleMoreInfo}>
                 More info
              </button>
              {COMMON_QUESTIONS.slice(0, 2).map((fq, i) => (
                <button
                  key={i}
                  className="chip secondary"
                  type="button"
                  onClick={() => handleFaqSelect(i)}
                >
                  {fq.q}
                </button>
              ))}
            </div>
          ) : (
            <div className="end-actions">
              <p className="end-text">
                You’ve reached the end of the onboarding instructions.
              </p>
              <a
                className="primary-button"
                href="/participant-instruction-leaflet.pdf"
                download
              >
                Download instructions as PDF
              </a>
              <p className="small-note">
                ({" "}
                <code>participant-instruction-leaflet.pdf</code> 
              </p>
            </div>
          )} */}

          
        </section>
      </main>
    </div>
  );
}

export default ChatbotPage;
