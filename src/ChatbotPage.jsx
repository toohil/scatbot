// src/ChatbotPage.jsx
import { useState } from "react";
import { useEffect, useRef } from "react";

function ChatbotPage({ onBack, session }) {
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState(() => [
    {
      id: `bot-${STEPS[0].id}`,
      sender: "bot",
      text: STEPS[0].text,
      title: STEPS[0].title,
    },
  ]);

  const currentStep = STEPS[currentIndex];
  const totalSteps = STEPS.length;

  
  const handleNext = () => {
    if (currentIndex < totalSteps - 1) {
      const nextIndex = currentIndex + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${currentStep.id}`,
          sender: "user",
          text: "Okay, got it – next step.",
        },
        {
          id: `bot-${STEPS[nextIndex].id}`,
          sender: "bot",
          title: STEPS[nextIndex].title,
          text: STEPS[nextIndex].text,
        },
      ]);

      setCurrentIndex(nextIndex);
    }
  };

  const handleMoreInfo = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-more-${currentStep.id}`,
        sender: "user",
        text: "Tell me more",
      },
      {
        id: `bot-more-${currentStep.id}`,
        sender: "bot",
        title: currentStep.title + " — More info",
        text: currentStep.moreInfo || "There is no additional information for this step.",
      },
    ]);
  };
  
  



  const handleFaqSelect = (index) => {
    // Append the selected FAQ question and its answer to the chat messages
    const fq = COMMON_QUESTIONS[index];
    if (!fq) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `user-faq-select-${currentStep.id}-${index}`,
        sender: "user",
        text: fq.q,
      },
      {
        id: `bot-faq-answer-${currentStep.id}-${index}`,
        sender: "bot",
        title: `Q: ${fq.q}`,
        text: fq.a,
      },
    ]);
  };

  const submitQuery = () => {
    // grab text from input field
    // submit to askChatbot function from worker.j
    const textInput = document.getElementById('freeTextInput');
    askChatbot(textInput);
  }
  // will also need to handle reading response

  const atEnd = currentIndex === totalSteps - 1;
const lastSavedIndexRef = useRef(0);

const bottomRef = useRef(null);

useEffect(() => {
  // You must have the session id available (passed from App)
  const sessionId = session?.session_id;
  if (!sessionId) return;

  // Only send messages that were added since last time
  const newMessages = messages.slice(lastSavedIndexRef.current);
  if (newMessages.length === 0) return;

  const sendOne = async (msg) => {
  
    const role =
      msg.sender === "user" || msg.role === "user" ? "user" : "bot";

    const content =
      msg.text ??
      msg.content ??
      msg.message ??
      (typeof msg === "string" ? msg : JSON.stringify(msg));

    // Fire-and-forget: don’t block the UI
    fetch(`http://localhost:5174/api/session/${sessionId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    }).catch(() => {});
  };

  // Send all new messages
  newMessages.forEach(sendOne);

  // Mark them as saved (so we don’t resend)
  lastSavedIndexRef.current = messages.length;
}, [messages, session]);

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
        <div className="progress">
          Step {currentIndex + 1} of {totalSteps}
        </div>
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
              {msg.title && <div className="message-title">{msg.title}</div>}
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
            <button className="chip" type="button" onClick={submitQuery}>
              Go
            </button>
          </div>          

          {!atEnd ? (
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
          )}

          
        </section>
      </main>
    </div>
  );
}

export default ChatbotPage;
