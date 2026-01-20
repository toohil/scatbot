// src/ChatbotPage.jsx
import { useState, useEffect, useRef } from "react";

const STEPS = [
  {
    id: 0,
    title: "Welcome to the study",
    text: `Welcome ,thank you for agreeing to take part in this research study.

Over the next few minutes we'll walk you through how to collect and store your stool sample so the lab can analyse it correctly. You can choose to move to the next step, ask for more information about this study, or view commonly asked questions.`,
    moreInfo: `This study is run by the research team to better understand gut health. Participation is voluntary and your samples are de-identified before analysis. If you have concerns about privacy or transport, contact the study coordinator.`,
  },
  {
    id: 1,
    title: "Sample freshness",
    text: `The stool sample should be as fresh as possible, ideally produced on the morning of your visit.

If this is not possible, a sample from the evening or night before may be saved in a fridge. This is less ideal and may interfere with analysis, so a morning sample is preferred.`,
    moreInfo: `Aim to collect within 24 hours of analysis; if you must keep it overnight, refrigerate immediately (not freezer). Avoid contamination with urine or water. If in doubt, contact the study team.`,
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
    moreInfo: `Use the provided items only. The AnaeroGen creates an oxygen-free environment for some analyses; the freezer block keeps samples cold in transit. If any item is missing, contact the study coordinator before your appointment.`,
  },
  {
    id: 3,
    title: "Night before – freeze the block",
    text: `The night before you collect the sample, place the freezer block in your freezer so it is fully frozen by the morning.`,
    moreInfo: `Freeze the block on a flat shelf so it freezes evenly. Do not put the freezer block inside the sample container. Keep it in its bag until packing to avoid contamination.`,
  },
  {
    id: 4,
    title: "Prepare to collect the sample",
    text: `On the morning of collection:

• Place the frozen freezer block into one of the zip-lock bags.
• Put on the disposable gloves.`,
    moreInfo: `Lay out all materials before starting. Work on a clean surface and avoid touching the inside of the container or the stool. Change gloves if they become contaminated.`,
  },
  {
    id: 5,
    title: "Collecting the stool sample",
    text: `Place the plastic container onto the toilet bowl and pass your bowel movement into this container.

Please:
• Collect the entire bowel motion, not just part of it.
• Avoid getting any urine into the container.
• Do not wrap or cover the sample in toilet paper.`,
    moreInfo: `If you find it difficult to collect the whole motion, try collecting the majority and note the time. If urine contamination occurs, discard the sample and contact the study team for advice. Wash hands thoroughly after collection.`,
  },
  {
    id: 6,
    title: "Using the AnaeroGen sachet",
    text: `On the lid of the container there is an AnaeroGen sachet taped on.

• Tear off the top of the outer sachet (do not remove the inner sachet).
• Within one minute of tearing the sachet, secure the lid of the container firmly.`,
    moreInfo: `The AnaeroGen creates an oxygen-reduced atmosphere which helps preserve anaerobic organisms for some tests. Do not remove the inner sachet. Seal the lid quickly after activating the sachet.`,
  },
  {
    id: 7,
    title: "Sealing the sample",
    text: `Place the sealed plastic container into the empty zip-lock bag.

• Remove and dispose of your gloves.
• Seal this zip-lock bag.
• Place this bag into the zip-lock bag that contains the frozen freezer block and seal again.`,
    moreInfo: `Double-bagging prevents leaks and keeps the sample cold next to the freezer block. Wipe any external contamination from the bag before placing it into the envelope. Dispose of gloves and any waste safely.`,
  },
  {
    id: 8,
    title: "Packing and labelling",
    text: `Place the zipped bag (containing the freezer block and the stool sample) into the paper envelope and seal it.

Write the date and time of the stool sample clearly on the envelope.`,
    moreInfo: `Use a permanent pen and write date/time in DD/MM/YYYY HH:MM format. Add your participant ID if supplied. Accurate labelling is essential for sample tracking and analysis.`,
  },
  {
    id: 9,
    title: "Storing before your visit",
    text: `Place the sealed envelope in your fridge until you leave for your research lab session.

Bring the envelope with you to your visit.`,
    moreInfo: `Keep the envelope in the main body of the fridge (not the door) until transport. Bring the sample in a cool bag if your journey is long and hand it to study staff on arrival.`,
  },
];

function ChatbotPage({ onBack, session }) {
  // const [loaded, setLoaded] = useState(true)
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
      text: "Chatbot is typing…",
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
  setIsLoading(true);
  showTyping();

  // added try/finally causen without any error was leaving the Go button disabled .
  try {
    // setLoaded(false) -> we can use a state to decide interface behaviour
    const role = "user";
    const textbox = document.getElementById("freeTextInput");
    const content = textbox.value;

    const response = await fetch(
      `http://localhost:5174/api/session/${sessionId}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      }
    ).catch(() => {});

    
    const output = await response.json();

    // setLoaded(true) -> cancel "loading behaviour"

    setMessages((prev) => [
      ...prev,
      {
        id: `user-freetext-query-${currentStep.id}`,
        sender: "user",
        text: content,
      },
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
              placeholder="Ask a question"
              id="freeTextInput"

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
