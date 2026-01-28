import express from "express";
import cors from "cors";
import crypto from "crypto";
import { Chatbot, ChatLogger } from "./chatfunctions.js";

// import dotenv from "dotenv";
// dotenv.config();
// // Tiny helper so missing env vars fail loudly (instead of vague errors)
// function mustGetEnv(name) {
//   const v = process.env[name];
//   if (!v) throw new Error(`Missing env var: ${name} (check server/.env)`);
//   return v;
// }

const steps = [
"The night before sample gathering, place the freezer block in the freezer overnight to freeze.",
"To begin the procedure, place the frozen freezer block in one of the ziplock bags.",
"Put on the disposable gloves.",
"Place the plastic container onto the toilet bowl and perform bowel movement into this (the whole bowel motion, not just part of it). Please avoid getting any urine in the plastic container and do not wrap or cover the sample in toilet paper.",
"Tear off the top of the AnaeroGen sachet which is taped to the lid of the container (see image below). Do not remove the inner sachet.",
"Within one minute of tearing the top of the sachet, secure the lid of the container firmly, and place the plastic container in second zip lock bag (i.e. the empty bag).",
"Remove and dispose of gloves.",
"Seal the zip lock bag, place the ziplock bag with the stool sample into the ziplock bag containing the frozen freezer block, and seal.",
"Place the ziplock bag (containing the freezer block, and containing the ziplock bag with the stool sample) in the paper envelope and seal.",
"Write down the date and the time of the stool sample on the envelope.",
"Place the sample in the fridge until you leave for the research lab session"
]

const app = express();
app.use(cors());
app.use(express.json());

// const cb = new Chatbot();
const db = new ChatLogger();
const cdb = {}
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
    await db.addUser(sessionId)
    console.log("User created with ID:", sessionId)
    cdb[sessionId] = new Chatbot(steps)
    await cdb[sessionId].initChatbot()
    console.log("Chatbot created for session:", sessionId)
    const output = await db.getUser(sessionId)
    res.json(output)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// SEND QUERY / RECEIVE RESPONSE
app.post("/api/session/:sessionId/chat", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { id, type, content } = req.body;
    const response = await cdb[sessionId].getChatbotResponse(type, content);
    db.addMessage( sessionId, id, "bot", response) // need to implement ID handling too! TODO
    res.json({ message: response })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to recognise message" });
  }
});

app.post("/api/session/:sessionId/logger", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { id, role, content } = req.body;

    db.addMessage(sessionId, id, role, content)
    res.json({ status: "ok" })
  } catch (err) {

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

// END SESSION (reclaims memory)
app.post("/api/session/:sessionId/kill-session", async (req, res) => {
  try {

    const { sessionId } = req.params;
    console.log("Killing session with ID:",sessionId)
    await cdb[sessionId].killChatbot()
    delete cdb[sessionId]

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to end session" });
  }
});

const PORT = 5174;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});