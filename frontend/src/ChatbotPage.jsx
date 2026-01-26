// src/ChatbotPage.jsx
import { useState, useEffect, useRef } from "react";

const STEPS = [
  {
    id: 0,
    title: "Welcome to the study",
    text: `Welcome, thank you for agreeing to take part in this research study.
Over the next few minutes we'll walk you through how to collect and store your stool sample so the lab can analyse it correctly. You can choose to move to the next step, ask for more information about this study, or view commonly asked questions.`,
  },
  {
    id: 1,
    title: "Sample freshness",
    text: `The stool sample should be as fresh as possible, ideally produced on the morning of your visit.

If this is not possible, a sample from the evening or night before may be saved in a fridge. This is less ideal and may interfere with analysis, so a morning sample is preferred.`,
  },
  {
    id: 2,
    title: "What is in the sample pack?",
    text: `Your sample pack contains:
      • Plastic lunch-box sized container with lid
      • Disposable gloves
      • 2 × zip-lock bags
      • AnaeroGen sachet
      • Paper envelope
      • Freezer block`,
  },
  {
    id: 3,
    title: "Night before – freeze the block",
    text: `The night before you collect the sample, place the freezer block in your freezer so it is fully frozen by the morning.`,
  },
  {
    id: 4,
    title: "Prepare to collect the sample",
    text: `On the morning of collection:

• Place the frozen freezer block into one of the zip-lock bags.
      • Put on the disposable gloves.`,
  },
  {
    id: 5,
    title: "Collecting the stool sample",
    text: `Place the plastic container onto the toilet bowl and pass your bowel movement into this container.
      Please:
      • Collect the entire bowel motion, not just part of it.
      • Avoid getting any urine into the container.
      • Do not wrap or cover the sample in toilet paper.`,
  },
  {
    id: 6,
    title: "Using the AnaeroGen sachet",
    text: `On the lid of the container there is an AnaeroGen sachet taped on.

• Tear off the top of the outer sachet (do not remove the inner sachet).
• Within one minute of tearing the sachet, secure the lid of the container firmly.`,
  },
  {
    id: 7,
    title: "Sealing the sample",
    text: `Place the sealed plastic container into the empty zip-lock bag.
    • Remove and dispose of your gloves.
    • Seal this zip-lock bag.
    • Place this bag into the zip-lock bag that contains the frozen freezer block and seal again.`,
  },
  {
    id: 8,
    title: "Packing and labelling",
    text: `Place the zipped bag (containing the freezer block and the stool sample) into the paper envelope and seal it.
      Write the date and time of the stool sample clearly on the envelope.`,
  },
  {
    id: 9,
    title: "Storing before your visit",
    text: `Place the sealed envelope in your fridge until you leave for your research lab session.
      Bring the envelope with you to your visit.`,
  },
];

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
    // can't skip to next step while chatbot response pending
    if (isLoading) return;
    
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

  // Get the most recent non-typing bot message so "More info" expands the right thing
const getLastBotMessage = () => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.sender === "bot" && !m.isTyping) return m;
  }
  return null;
};

const handleMoreInfo = async () => {
  // stop spam clicks
  if (isLoading) return;

  const sessionId = session?.session_id;
  if (!sessionId) return;

  // Find what we’re expanding (last bot message in the chat)
  const lastBot = getLastBotMessage();
  if (!lastBot) return;

  // Show the user’s request in chat immediately
  setMessages((prev) => [
    ...prev,
    {
      id: `user-more-${Date.now()}`,
      sender: "user",
      text: "Tell me more",
    },
  ]);

  setIsLoading(true);
  showTyping();

  try {
    const role = "user";
    // IMPORTANT: include the last bot message so the LM knows what to expand on
    const content = `Tell me something new, related to the current step.`;
    const step = lastBot.text

    const response = await fetch(
      `http://localhost:5174/api/session/${sessionId}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, role, content }),
      }
    );

    const output = await response.json();

    // Add the model's "more info" response
    setMessages((prev) => [
      ...prev,
      {        
        id: `bot-more-${Date.now()}`,
        sender: "bot",
        title: `More Info: ${lastBot.title}`,
        text: output.message,
      },
    ]);
  } catch (e) {
    // keep your existing error behaviour style
    setMessages((prev) => [
      ...prev,
      {
        id: `bot-error-${Date.now()}`,
        sender: "bot",
        text: "Sorry — something went wrong. Please try again.",
      },
    ]);
  } finally {
    hideTyping();
    setIsLoading(false);
  }
};

// Added loading state + typing message id ref
const [isLoading, setIsLoading] = useState(false);
const typingIdRef = useRef(null);

// func to  show typing message
const showTyping = () => {
  const typingId = `bot-typing-${Date.now()}`;
  typingIdRef.current = typingId;

  setMessages((prev) => [
    ...prev,
    {
      id: typingId,
      sender: "bot",
      text: "TYPING_INDICATOR", // Special marker for animated dots
      isTyping: true,
    },
  ]);
};

// func to remove typing message
const hideTyping = () => {
  const typingId = typingIdRef.current;
  if (!typingId) return;

  setMessages((prev) => prev.filter((m) => m.id !== typingId));
  typingIdRef.current = null;
};


const submitQuery = async () => {
  
  //added this to stop spamming
  if (isLoading) return;

  // grab text from input field
  // submit to askChatbot function from worker.js
  const sessionId = session?.session_id;
  console.log(sessionId);

  if (!sessionId) return;

  //turning on typing UI
  const role = "user";
  const textbox = document.getElementById("freeTextInput");
  const content = textbox.value;
  const step = currentStep.text;
  // added this heree to clear input field automatically
  textbox.value = "";

  // render query before sending 
  setMessages((prev) => [
    ...prev,
    {
      id: `user-freetext-query-${currentStep.id}`,
      sender: "user",
      text: content,
    },
  ]);

  setIsLoading(true);
  showTyping();

  // added try/finally causen without them any error was leaving the Go button disabled .
  try {

    const response = await fetch(
      `http://localhost:5174/api/session/${sessionId}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, role, content }),
      }
    ).catch(() => {});

    
    const output = await response.json();

    setMessages((prev) => [
      ...prev,
      {
        id: `bot-generated-answer-${currentStep.id}`,
        sender: "bot",
        title: `Q: ${content}`,
        text: `${output["message"]}`,
      },
    ]);
  } catch (e) {
    //  show a  bot error message instead of silently breaking.
    setMessages((prev) => [
      ...prev,
      {
        id: `bot-error-${Date.now()}`,
        sender: "bot",
        text: "Sorry — something went wrong. Please try again.",
      },
    ]);
  } finally {
    // Always remove the typing bubble and re-enable the Go button.
    // This runs whether the request succeeds or fails.
    hideTyping();
    setIsLoading(false);
  }
};

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
    
    // typing indicators were showing up in db
      if (content === "TYPING INDICATOR") return;

    // don’t block the UI
    await fetch(`http://localhost:5174/api/session/${sessionId}/logger`, {
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

//added this to handle enter key press in input field
const handleInputKeyDown = (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitQuery();
  }
};

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
                {msg.isTyping ? (
                  <>
                    
                    <span className="typing-indicator">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </span>
                  </>
                ) : (
                  msg.text.split("\n").map((line, idx) => (
                    <span key={idx}>
                      {line}
                      <br />
                    </span>
                  ))
                )}
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
              placeholder="Ask a question"
              id="freeTextInput"
              onKeyDown={handleInputKeyDown}
              //added disabled when loading 
              disabled={isLoading}

            />
           <button className="chip" type="button"
             onClick={submitQuery} 
             disabled={isLoading}>
            {isLoading ? "…" : "Go"}
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
