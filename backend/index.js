import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { Chatbot, ChatLogger } from "./chatfunctions.js";

dotenv.config();
var pipelines = {}

// Tiny helper so missing env vars fail loudly (instead of vague errors)
function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name} (check server/.env)`);
  return v;
}

const app = express();
// app.use(cors());
app.use(express.json());

const db = new ChatLogger()

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

    // need to implement db functions 
    db.createUser(sessionId) // stub currently
    const [rows] = db.getUser(sessionId)

    // this is fairly hacky - we're populating a dictionary with new chatbot objects per sessionId key.
    // need to make sure we unload them after sessions end using pipeline[sessionId].killChatbot()
    pipelines[sessionId] = [new Chatbot]
    pipelines[sessionId].initChatbot()

    res.json(rows[0])

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

    // not sure yet how we'll handle the delay between submit query/received response.
    // maybe frontend fire & ignore -> monitor some status page -> get response when status changes
    const response = await pipelines[sessionId].getChatbotResponse(content)

    // also not implemented
    db.logMessage(sessionId, role, content)
    db.logMessage(sessionId, "bot", response)
    
    // consider this placeholder code for now, we could maybe do better.
    res.json[{ "response": response }]
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

// SESSION STATUS
app.get("/api/session/:sessionId/status", async (req, res) => {
  try {
    const { sessionId } = req.params;
    // implement some function to retrieve per-session status (e.g. model loaded, pipeline working)

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save message" });
  }
});


// GET MESSAGES
// app.get("/api/session/:sessionId/messages", async (req, res) => {
//   try {
//     const { sessionId } = req.params;

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch messages" });
//   }
// });

// END SESSION
app.post("/api/session/:sessionId/kill-session", async (req, res) => {
  try {
    const { sessionId } = req.params;

    pipelines[sessionId].killChatbot()

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to end session" });
  }
});

const PORT = 5174;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
