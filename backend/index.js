import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { Chatbot, ChatLogger } from "./chatfunctions.js";

dotenv.config();
// Tiny helper so missing env vars fail loudly (instead of vague errors)
function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name} (check server/.env)`);
  return v;
}

const app = express();
app.use(cors());
app.use(express.json());

const cb = new Chatbot();
const db = new ChatLogger();
await db.init()

// CHECK HEALTH
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// INITIATE SESSION
app.post("/api/session", async (_req, res) => {
  try {
    // been thinking about how to handle uuids - ideally we could give a human-readable identifier
    // -> this would allow the user to maintain right to withdraw anonymously
    // (we make some form available which deletes db entries associated with this identifier)
    // something like https://www.npmjs.com/package/unique-names-generator would work well.
    const sessionId = crypto.randomUUID();
    
    await cb.newChatSession(sessionId)
    await db.addUser(sessionId)

    const output = await db.getUser(sessionId)

    res.json(output)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// SEND QUERY / RECEIVE RESPONSE
app.post("/api/session/:sessionId/message", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, content } = req.body;
    db.addMessage(sessionId, role, content)
    // not sure yet how we'll handle the delay between submit query/received response.
    // maybe frontend fire & ignore -> monitor some status page -> get response when status changes
    const response = await cb.getChatbotResponse(sessionId, content)
    db.addMessage(sessionId, "bot", response)
    // also not implemented
    
    // consider this placeholder code for now, we could maybe do better.
    res.json[{ "response": response }]
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

// GET MESSAGES
app.get("/api/session/:sessionId/messages", async (req, res) => {
  try {
    
    const { sessionId } = req.params;
    db.getMessages(sessionId)

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// END SESSION (right now this actually unloads models entirely, not technically the same thing)
app.post("/api/session/:sessionId/kill-session", async (req, res) => {
  try {

    const { sessionId } = req.params;
    cb.killChatbot()

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to end session" });
  }
});

const PORT = 5174;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
